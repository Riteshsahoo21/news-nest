import LiveBlog from '../models/LiveBlog.js';

// Get all live blogs (optionally filter by isLive)
export const getAllLiveBlogs = async (req, res) => {
  try {
    const { status } = req.query; // e.g. ?status=live or ?status=ended
    
    let query = {};
    if (status === 'live') query.isLive = true;
    else if (status === 'ended') query.isLive = false;

    const liveBlogs = await LiveBlog.find(query).sort({ createdAt: -1 });
    res.json(liveBlogs);
  } catch (error) {
    console.error('Error fetching live blogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single live blog by ID
export const getLiveBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const liveBlog = await LiveBlog.findById(id);
    
    if (!liveBlog) {
      return res.status(404).json({ error: 'Live blog not found' });
    }
    
    res.json(liveBlog);
  } catch (error) {
    console.error('Error fetching live blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new live blog
export const createLiveBlog = async (req, res) => {
  try {
    const { title, description, category, author, mainImageUrl } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Please provide title, description, and category' });
    }

    const liveBlog = await LiveBlog.create({
      title,
      description,
      category,
      author,
      mainImageUrl,
      updates: [] // Starts empty
    });

    res.status(201).json({
      message: 'Live blog created successfully',
      liveBlog
    });
  } catch (error) {
    console.error('Error creating live blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a minute-by-minute update to a live blog
export const addUpdateToLiveBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, imageUrl } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Please provide update content' });
    }

    const liveBlog = await LiveBlog.findById(id);
    if (!liveBlog) {
      return res.status(404).json({ error: 'Live blog not found' });
    }

    // Push the new update into the updates array
    liveBlog.updates.push({ content, imageUrl });
    
    // Save the parent document
    await liveBlog.save();

    res.status(201).json({
      message: 'Update added successfully',
      liveBlog
    });
  } catch (error) {
    console.error('Error adding update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle save/bookmark on a live blog
export const saveLiveBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const liveBlog = await LiveBlog.findById(id);
    if (!liveBlog) return res.status(404).json({ error: 'Live blog not found' });

    const saveIndex = liveBlog.savedBy.indexOf(userId);
    if (saveIndex === -1) {
      liveBlog.savedBy.push(userId); // Add save
    } else {
      liveBlog.savedBy.splice(saveIndex, 1); // Remove save
    }

    await liveBlog.save();
    res.json({ message: 'Save status toggled', saved: saveIndex === -1 });
  } catch (error) {
    console.error('Error saving live blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
