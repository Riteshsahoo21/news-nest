const allowedCats = ["jokes"];
const hasAll = false;

const defaultCats = [
  { _id: 'politics', name: 'Politics' },
  { _id: 'sports', name: 'Sports' }
];

const catResData = [
  { _id: '1', name: 'jokes' }
];

const merged = [...defaultCats];
if (catResData && catResData.length > 0) {
  catResData.forEach(dbCat => {
    if (!merged.some(c => c.name.toLowerCase() === dbCat.name.toLowerCase())) {
      merged.push(dbCat);
    }
  });
}

const finalCats = hasAll ? merged : merged.filter(c => allowedCats.includes(c.name.toLowerCase()));
console.log('Final Categories:', finalCats);
