import mongoose from 'mongoose';

mongoose.connect('mongodb://localhost:27017/news-nests-db')
  .then(async () => {
    const settings = await mongoose.connection.collection('settings').find({}).toArray();
    console.log('Total settings documents:', settings.length);
    console.log(settings);

    const ads = await mongoose.connection.collection('advertisements').find({ isActive: true }).toArray();
    console.log('Active ads count:', ads.length);
    ads.forEach(ad => console.log('Ad:', ad.title, ad.position, ad.isActive));
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
