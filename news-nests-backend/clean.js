import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/news-nests');
  
  const userSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.model('User', userSchema);
  
  const invoiceSchema = new mongoose.Schema({}, { strict: false });
  const Invoice = mongoose.model('Invoice', invoiceSchema);
  
  const user = await User.findOne({ email: 'dfnokh1@gmail.com' });
  if (user) {
    console.log('Found user:', user._id);
    const deleteResult = await Invoice.deleteMany({ user: user._id });
    console.log('Deleted invoices:', deleteResult.deletedCount);
    
    await User.updateOne({ _id: user._id }, { 
      $set: { isPremium: false, cancelAtPeriodEnd: false },
      $unset: { subscriptionPlanId: 1, subscriptionExpiry: 1 }
    });
    console.log('User subscription fields cleared.');
  } else {
    console.log('User not found.');
  }
  process.exit(0);
};

run();
