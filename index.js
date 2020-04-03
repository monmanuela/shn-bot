const dotenv = require('dotenv');
const schedule = require('node-schedule');
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
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

// Ping Heroku app every 15 minutes to prevent idling
setInterval(() => {
  http.get('http://shn-bot.herokuapp.com/');
  console.log('ping');
}, 900000); // every 15 minutes (900000)

const db = require('./firestore');

const subscribersCollection = 'subscribers-new';
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '<b>Welcome!</b>\nType <code>/subscribe</code> to get daily reminders to order '
      + "food so you won't go hungry!\nType <code>/unsubscribe</code> if you no longer want to receive the reminders.",
  { parse_mode: 'HTML' })
    .catch((err) => console.error('Error sending message', err));
});

bot.onText(/\/subscribe/, (msg) => {
  const chatId = msg.chat.id;
  db.collection(subscribersCollection).doc(chatId.toString()).set({
    message_id: chatId,
    subscribing: true,
  })
    .then(() => {
      console.log(`Added to subscriber: ${msg.from.first_name}, ID: ${chatId}`);
      bot.sendMessage(chatId, 'Subscribed!')
        .catch((err) => console.error('Error sending message', err));
    })
    .catch((err) => console.error('Error adding subscriber: ', err));
});

bot.onText(/\/unsubscribe/, (msg) => {
  const chatId = msg.chat.id;
  db.collection(subscribersCollection).doc(chatId.toString()).set({
    message_id: chatId,
    subscribing: false,
  })
    .then(() => {
      bot.sendMessage(chatId, 'Unsubscribed!')
        .catch((err) => console.error('Error sending message', err));
      console.log(`Removed from subscriber: ${msg.from.first_name}, ID: ${chatId}`);
    })
    .catch((err) => console.error('Error removing subscriber: ', err));
});

const remindSubscribers = () => {
  db.collection('subscribers').where('subscribing', '==', true).get()
    .then((snapshot) => {
      const subscribers = [];
      snapshot.forEach((doc) => {
        subscribers.push(doc.data().message_id);
      });
      subscribers.forEach((chatId) => {
        bot.sendMessage(chatId, 'Hey, don\'t forget to order your meals from the correct hotel! :)\n'
          + '- <a href="https://docs.google.com/forms/d/e/1FAIpQLSelCkJ-ubT_LB6O1RjqiRYgf9CMBss13-Osqta8zbUyYe37lA/viewform">Swissotel Stamford</a>', { parse_mode: 'HTML' })
          .then(() => {
            bot.sendSticker(
              chatId, stickers.reminders[Math.floor(Math.random() * stickers.reminders.length)],
            )
              .catch((err) => console.error('Error sending sticker', err));
          })
          .catch((err) => console.error('Error sending message', err));
      });
    })
    .catch((err) => console.error('Error getting documents', err));
};

// First reminder at 03:00 UTC (11am SGT)
schedule.scheduleJob('0 3 * * *', remindSubscribers);

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
        ))
        .catch((err) => console.error('Error sending message', err));
    }
  });
});

// To get sticker ID
bot.on('sticker', (msg) => {
  console.log(msg.sticker.file_id);
});
