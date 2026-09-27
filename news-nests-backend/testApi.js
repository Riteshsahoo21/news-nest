import axios from 'axios';

axios.get('http://localhost:5000/api/news/jokes')
  .then(res => {
    console.log('Response:', res.data.length, 'articles');
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
