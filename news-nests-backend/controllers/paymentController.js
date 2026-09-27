import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
// In a real app, these come from process.env.RAZORPAY_KEY_ID and process.env.RAZORPAY_KEY_SECRET
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

// Create a new payment order
export const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt = 'receipt_1' } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const options = {
      amount: amount * 100, // Razorpay expects amount in the smallest currency unit (paise)
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ error: 'Failed to create order' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify a payment signature
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification details' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';

    // Generate expected signature using HMAC-SHA256
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      // Payment is verified
      // TODO: Here you would typically mark a user's subscription as active in the database
      res.json({ message: 'Payment verified successfully', status: 'ok' });
    } else {
      // Payment is tampered
      res.status(400).json({ error: 'Payment verification failed', status: 'failed' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
