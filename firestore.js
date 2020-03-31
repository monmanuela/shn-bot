const firebase = require('firebase');
// Required for side-effects
require('firebase/firestore');

firebase.initializeApp({
  apiKey: process.env.DB_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
});

const db = firebase.firestore();

module.exports = db;
