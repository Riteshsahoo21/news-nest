import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const token = jwt.sign({ userId: '64f9f4a9b5f5b4a9b5f5b4a9', role: 'admin' }, process.env.JWT_SECRET || 'wqhdwqidhqwpifbip');
  
  try {
    const res = await axios.post('http://localhost:5000/api/stripe/create-checkout-session', 
      { planId: '64f9f4a9b5f5b4a9b5f5b4a9' }, // Doesn't matter if it's fake, we want to see the error
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

test();
