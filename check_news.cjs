require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(() => mongoose.connection.db.collection('news').find().toArray())
  .then(news => console.log(news.map(n => ({title: n.title, status: n.status, author: n.author}))))
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
