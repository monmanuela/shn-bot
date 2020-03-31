const dotenv = require('dotenv');
const schedule = require('node-schedule');

dotenv.config();

const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

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
        bot.sendMessage(chatId, 'Hey, don\'t forget to order your meals <a href="http://gg.gg/innroommenu">here</a> :)', { parse_mode: 'HTML' });
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

// TODO: Don't ping Heroku dyno at 12am - 7am

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  const greetings = ['hi', 'hello', 'hey'];
  greetings.forEach((greeting) => {
    if (msg.text.toString().toLowerCase().indexOf(greeting) === 0) {
      bot.sendMessage(chatId, `Hello ${msg.from.first_name}!`);
    }
  });
});
