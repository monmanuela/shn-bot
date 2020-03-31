const dotenv = require('dotenv');
const schedule = require('node-schedule');
const TelegramBot = require('node-telegram-bot-api');
const stickers = require('./stickers');

dotenv.config();


const port = process.env.PORT || 443;
const host = process.env.HOST || '0.0.0.0';
const useWebhook = process.env.USE_WEBHOOK;
const externalUrl = 'https://shn-bot.herokuapp.com/';
const token = process.env.BOT_TOKEN;
let bot;
if (useWebhook) {
  console.log('Using webhook');
  bot = new TelegramBot(token, { webHook: { port, host } });
  bot.setWebHook(`${externalUrl}:443/bot${token}`);
} else {
  console.log('Using polling');
  bot = new TelegramBot(token, { polling: true });
}

const db = require('./firestore');

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '<b>Welcome!</b>\nType <code>/subscribe</code> to get daily reminders to order '
      + "food so you won't go hungry!\nType <code>/unsubscribe</code> if you no longer want to receive the reminders.",
  { parse_mode: 'HTML' });
});

bot.onText(/\/subscribe/, (msg) => {
  const chatId = msg.chat.id;
  db.collection('subscribers').doc(chatId.toString()).set({
    message_id: chatId,
    subscribing: true,
  })
    .then(() => {
      console.log(`Added to subscriber: ${msg.from.first_name}, ID: ${chatId}`);
      bot.sendMessage(chatId, 'Subscribed!');
    })
    .catch((error) => {
      console.error('Error adding subscriber: ', error);
    });
});

bot.onText(/\/unsubscribe/, (msg) => {
  const chatId = msg.chat.id;
  db.collection('subscribers').doc(chatId.toString()).set({
    message_id: chatId,
    subscribing: false,
  })
    .then(() => {
      bot.sendMessage(chatId, 'Unsubscribed!');
      console.log(`Removed from subscriber: ${msg.from.first_name}, ID: ${chatId}`);
    })
    .catch((error) => {
      console.error('Error removing subscriber: ', error);
    });
});

const remindSubscribers = () => {
  db.collection('subscribers').where('subscribing', '==', true).get()
    .then((snapshot) => {
      const subscribers = [];
      snapshot.forEach((doc) => {
        subscribers.push(doc.data().message_id);
      });
      subscribers.forEach((chatId) => {
        bot.sendMessage(chatId, 'Hey, don\'t forget to order your meals <a href="http://gg.gg/innroommenu">here</a> :)', { parse_mode: 'HTML' })
          .then(() => bot.sendSticker(
            chatId, stickers.reminders[Math.floor(Math.random() * stickers.reminders.length)],
          ));
      });
    })
    .catch((err) => {
      console.log('Error getting documents', err);
    });
};

// First reminder at 07:00 UTC (3pm SGT)
schedule.scheduleJob('0 7 * * *', remindSubscribers);

// Second reminder at 09:00 UTC (5pm SGT)
schedule.scheduleJob('0 9 * * *', remindSubscribers);

bot.on('text', (msg) => {
  const chatId = msg.chat.id;

  const greetings = ['hi', 'hello', 'hey'];
  greetings.forEach((greeting) => {
    if (msg.text.toString().toLowerCase().indexOf(greeting) === 0) {
      bot.sendMessage(chatId, `Hello ${msg.from.first_name}!`)
        .then(() => bot.sendSticker(
          chatId, stickers.greetings[Math.floor(Math.random() * stickers.greetings.length)],
        ));
    }
  });
});

// To get sticker ID
bot.on('sticker', (msg) => {
  console.log(msg.sticker.file_id);
});
