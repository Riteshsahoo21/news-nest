import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function test() {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Test',
              description: 'Test Subscription',
            },
            unit_amount: 19900,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/payment-cancel`,
      client_reference_id: "test-123",
      metadata: {
        userId: "test-123",
        planId: "plan-123",
        duration: "monthly"
      }
    });
    console.log('Session created:', session.url);
  } catch (error) {
    console.error('Stripe Error:', error.message);
  }
}

test();
