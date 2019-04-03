const config = require('./config')
const data = require('./data')
const { text, buttons } = config
const telegraf = require('telegraf')
const mongodb = require('mongodb').MongoClient
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const { leave } = Stage
const bot = new telegraf(data.token)


const stage = new Stage()
stage.command('cancel', leave())

const main = new Scene('main')
stage.register(main)
const afterMenu = new Scene('afterMenu')
stage.register(afterMenu)
const getName = new Scene('getName')
stage.register(getName)
const getNum = new Scene('getNum')
stage.register(getNum)
const getPic = new Scene('getPic')
stage.register(getPic)

bot.use(session())
bot.use(stage.middleware())


let start = (ctx) => {
  ctx.reply(
    text.hello,
    { reply_markup: { keyboard: buttons.hello, resize_keyboard: true, one_time_keyboard: true } }
  )
  ctx.scene.enter('main')
}

bot.start((ctx) => { 
  start(ctx)
})

bot.hears(buttons.main[0], (ctx) => { // start
  start(ctx)
})


main.hears([buttons.hello[0][0], buttons.hello[1][0]], async (ctx) => { // competitions
  ctx.reply(
    text.menu,
    { reply_markup: { keyboard: buttons.menu, resize_keyboard: true, one_time_keyboard: true } }
  )
  await ctx.scene.leave('main')
  ctx.scene.enter('afterMenu')
})

main.hears(buttons.hello[2][0], (ctx) => { // about project
  ctx.reply(
    text.aboutProject,
    { reply_markup: { keyboard: buttons.main, resize_keyboard: true, one_time_keyboard: true } }
    )
  ctx.scene.leave('main')
})


afterMenu.hears(buttons.menu[0][0], async (ctx) => { // participate
  ctx.reply(text.getName)
  await ctx.scene.leave('afterMenu')
  ctx.scene.enter('getName')
})

afterMenu.hears(buttons.menu[1][0], (ctx) => { // about compet
  ctx.reply(
    text.aboutCompet,
    { reply_markup: { keyboard: buttons.main, resize_keyboard: true, one_time_keyboard: true } }
  )
  ctx.scene.leave('afterMenu')
})


getName.on('text', async (ctx) => {
  ctx.session.name = ctx.message.text
  ctx.reply(
    text.getNum,
    { reply_markup: { keyboard: buttons.getNum, resize_keyboard: true, one_time_keyboard: true } }  
  )
  await ctx.scene.leave('getName')
  ctx.scene.enter('getNum')
})


getNum.hears(/.+[1-9]{12}$/, async (ctx) => {
  ctx.session.number = ctx.message.text
  ctx.reply(text.getPic)
  await ctx.scene.leave('getNum')
  ctx.scene.enter('getPic')
})

getNum.on('text', (ctx) => {
  ctx.reply(text.invalidNum)
})

getNum.on('contact', async (ctx) => {
  ctx.session.number = ctx.message.contact.phone_number
  ctx.reply(text.getPic)
  await ctx.scene.leave('getNum')
  ctx.scene.enter('getPic')
})


getPic.on('photo', (ctx) => {
  ctx.reply(
    text.succes,
    { reply_markup: { keyboard: buttons.main, resize_keyboard: true, one_time_keyboard: true } }
  )
  ctx.scene.leave('getPic')

  for (let key of data.admins) {
    bot.telegram.sendPhoto(
      key,
      ctx.message.photo[ctx.message.photo.length - 1].file_id,
      { caption: `Новая заявка! \nИмя: ${ctx.session.name} \nномер: ${ctx.session.number}` }
    )
      .catch((err) => {
        if (err.code !== 409) {
          sendError(err, ctx.from.id, ctx.from.first_name)
        }
      })
  }
})


bot.on('message', (ctx) => {
  start(ctx)
})


function sendError (err, id, nick) {
  if (!id) {
    return bot.telegram.sendMessage(data.dev, 'There`s an error! Text: ' + err)
  }
  bot.telegram.sendMessage(data.dev, 'There`s an error! Text: ' + err + '\nUser: [' + nick + '](tg://user?id=' + id + ')')
}

bot.startWebhook('/testauf', null, 2106)
// bot.startPolling()