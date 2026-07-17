import Stripe from 'stripe';
import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Invoice from '../models/Invoice.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export const createCheckoutSession = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id; // from verifyToken middleware

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Subscription plan not found or inactive' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: plan.name,
              description: plan.description || `News Nests ${plan.name} Subscription`,
            },
            unit_amount: Math.round(plan.price * 100), // Stripe expects smallest unit
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-cancel`,
      client_reference_id: userId.toString(),
      metadata: {
        userId: userId.toString(),
        planId: planId.toString(),
        duration: plan.duration ? plan.duration.toString() : 'monthly'
      }
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    res.status(500).json({ error: error.message || 'Internal server error', stack: error.stack });
  }
};

export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

  let event;

  try {
    // req.body should be raw buffer here
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      const userId = session.metadata.userId;
      const planId = session.metadata.planId;
      const duration = session.metadata.duration;
      
      try {
        const user = await User.findById(userId);
        if (user) {
          user.isPremium = true;
          user.subscriptionPlanId = planId;
          
          // Calculate expiry
          let baseDate = new Date();
          // If the user currently has an active plan that hasn't expired, append the new time to it!
          if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > baseDate) {
            baseDate = new Date(user.subscriptionExpiry);
          }
          
          if (duration === 'monthly') {
            baseDate.setMonth(baseDate.getMonth() + 1);
          } else if (duration === '6_months') {
            baseDate.setMonth(baseDate.getMonth() + 6);
          } else if (duration === 'yearly') {
            baseDate.setFullYear(baseDate.getFullYear() + 1);
          }
          user.subscriptionExpiry = baseDate;
          user.cancelAtPeriodEnd = false; // Reset cancellation flag since they renewed
          
          await user.save();
          console.log(`User ${userId} successfully subscribed to plan ${planId}`);
          
          // Generate Invoice
          const plan = await SubscriptionPlan.findById(planId);
          await Invoice.create({
            user: userId,
            stripeSessionId: session.id,
            planName: plan ? plan.name : 'Unknown Plan',
            amount: session.amount_total / 100, // Stripe amount is in paise/cents
            currency: session.currency,
            status: 'paid'
          });
        }
      } catch (err) {
        console.error('Error updating user after payment or saving invoice:', err);
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};

export const verifySession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const userId = session.metadata.userId;
    const planId = session.metadata.planId;
    const duration = session.metadata.duration;

    const user = await User.findById(userId);
    if (user) {
      // Check if we already processed this session to avoid double-processing
      const existingInvoice = await Invoice.findOne({ stripeSessionId: sessionId });
      
      if (!existingInvoice) {
        // Process the renewal/subscription
        user.isPremium = true;
        user.subscriptionPlanId = planId;
        
        // Calculate expiry
        let baseDate = new Date();
        // If the user currently has an active plan that hasn't expired, append the new time to it!
        if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > baseDate) {
          baseDate = new Date(user.subscriptionExpiry);
        }
        
        if (duration === 'monthly') {
          baseDate.setMonth(baseDate.getMonth() + 1);
        } else if (duration === '6_months') {
          baseDate.setMonth(baseDate.getMonth() + 6);
        } else if (duration === 'yearly') {
          baseDate.setFullYear(baseDate.getFullYear() + 1);
        }
        user.subscriptionExpiry = baseDate;
        user.cancelAtPeriodEnd = false; // Reset cancellation flag since they renewed
        
        await user.save();
        console.log(`User ${userId} manually verified and subscribed to plan ${planId}`);
        
        // Generate Invoice
        const plan = await SubscriptionPlan.findById(planId);
        await Invoice.create({
          user: userId,
          stripeSessionId: sessionId,
          planName: plan ? plan.name : 'Unknown Plan',
          amount: session.amount_total / 100,
          currency: session.currency,
          status: 'paid'
        });
      }
    }

    res.json({ success: true, isPremium: true });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
};

