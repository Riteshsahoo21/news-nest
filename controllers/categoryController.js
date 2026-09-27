import Category from '../models/Category.js';

// Get all active categories (Public)
export const getActiveCategories = async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.type) {
      // If a specific type is requested (e.g. ?type=article), only fetch categories that support it
      query.contentTypes = req.query.type;
    }
    const categories = await Category.find(query).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all categories including inactive (Admin)
export const getAllCategoriesAdmin = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new category (Admin)
export const createCategory = async (req, res) => {
  try {
    const { name, description, contentTypes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const payload = { name, description };
    if (contentTypes && Array.isArray(contentTypes)) {
      payload.contentTypes = contentTypes;
    }

    const category = await Category.create(payload);
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a category (Admin)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, contentTypes } = req.body;

    const payload = { name, description, isActive };
    if (contentTypes && Array.isArray(contentTypes)) {
      payload.contentTypes = contentTypes;
    }

    const category = await Category.findByIdAndUpdate(
      id,
      payload,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Category name already in use' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a category (Admin)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Note: In a real system, you might want to prevent deleting a category if it's currently in use
    // For now, we'll just allow deletion.
    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully', categoryId: id });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
