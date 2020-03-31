const dotenv = require('dotenv');

dotenv.config();

const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "<b>Welcome!</b>\nI'll remind you to order your meals every day when the form is open so you won't go hungry!", { parse_mode: 'HTML' });
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
