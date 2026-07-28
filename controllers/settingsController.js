import Settings from '../models/Settings.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ isGlobal: true });
    
    // Create default if it doesn't exist yet
    if (!settings) {
      settings = await Settings.create({ isGlobal: true });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { newsletterEnabled, newsletterFrequency, adPriority, adsenseClientId } = req.body;
    
    let settings = await Settings.findOne({ isGlobal: true });
    if (!settings) {
      settings = new Settings({ isGlobal: true });
    }

    if (newsletterEnabled !== undefined) settings.newsletterEnabled = newsletterEnabled;
    if (newsletterFrequency !== undefined) settings.newsletterFrequency = newsletterFrequency;
    if (adPriority !== undefined) settings.adPriority = adPriority;
    if (adsenseClientId !== undefined) settings.adsenseClientId = adsenseClientId;

    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
