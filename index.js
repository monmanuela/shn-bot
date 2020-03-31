const dotenv = require('dotenv');

dotenv.config();

const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

const db = require('./firestore');

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

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

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  const greetings = ['hi', 'hello', 'hey'];
  greetings.forEach((greeting) => {
    if (msg.text.toString().toLowerCase().indexOf(greeting) === 0) {
      bot.sendMessage(chatId, `Hello ${msg.from.first_name}!`);
    }
  });
});
