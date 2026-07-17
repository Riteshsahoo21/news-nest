import SubscriptionPlan from '../models/SubscriptionPlan.js';

// Get all subscription plans (Public or Admin)
export const getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new subscription plan (Admin only)
export const createPlan = async (req, res) => {
  try {
    const { name, description, price, duration, features, isActive } = req.body;

    if (!name || price === undefined || !duration) {
      return res.status(400).json({ error: 'Name, price, and duration are required' });
    }

    const existingPlan = await SubscriptionPlan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ error: 'A subscription plan with this name already exists' });
    }

    const newPlan = await SubscriptionPlan.create({
      name,
      description,
      price,
      duration,
      features: features || [],
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ message: 'Subscription plan created successfully', plan: newPlan });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a subscription plan (Admin only)
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, features, isActive } = req.body;

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    // Check for name conflict
    if (name && name !== plan.name) {
      const existingPlan = await SubscriptionPlan.findOne({ name });
      if (existingPlan) {
        return res.status(400).json({ error: 'A subscription plan with this name already exists' });
      }
    }

    const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
      id,
      {
        name: name !== undefined ? name : plan.name,
        description: description !== undefined ? description : plan.description,
        price: price !== undefined ? price : plan.price,
        duration: duration !== undefined ? duration : plan.duration,
        features: features !== undefined ? features : plan.features,
        isActive: isActive !== undefined ? isActive : plan.isActive
      },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Subscription plan updated successfully', plan: updatedPlan });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a subscription plan (Admin only)
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    await SubscriptionPlan.findByIdAndDelete(id);
    res.json({ message: 'Subscription plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
