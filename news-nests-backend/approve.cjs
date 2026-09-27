require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(() => mongoose.connection.db.collection('news').updateMany({status:'pending'}, {$set:{status:'approved'}}))
  .then(res => console.log('Approved:', res.modifiedCount))
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
