import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';

// Let's create a simple custom switch since we might not have headless UI installed
const CustomSwitch = ({ checked, onChange }) => (
  <div
    className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${
      checked ? 'bg-primary' : 'bg-gray-300'
    }`}
    onClick={() => onChange(!checked)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </div>
);

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    newsletterEnabled: true,
    newsletterFrequency: 'daily',
    adPriority: 'adsense_first',
    adsenseClientId: 'ca-pub-xxxxxxxxxxxxxx',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setSettings({
          newsletterEnabled: res.data.newsletterEnabled ?? true,
          newsletterFrequency: res.data.newsletterFrequency || 'daily',
          adPriority: res.data.adPriority || 'adsense_first',
          adsenseClientId: res.data.adsenseClientId || 'ca-pub-xxxxxxxxxxxxxx',
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await api.put('/settings', settings);
      setMessage({ text: 'Settings saved successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setMessage({ text: 'Failed to save settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!user?.roles?.includes('admin')) {
    return <div className="p-8 text-center text-red-500">Access Denied. Admins only.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Global Settings</h1>
          <p className="text-muted-foreground mt-1">Manage platform-wide configurations.</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded mb-6 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Newsletter Automation Settings */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">Newsletter Automation</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold block text-lg">Enable Automated Digests</label>
                <p className="text-sm text-muted-foreground">When enabled, the system will automatically send top news to all subscribers based on the frequency below.</p>
              </div>
              <CustomSwitch 
                checked={settings.newsletterEnabled} 
                onChange={(checked) => setSettings({ ...settings, newsletterEnabled: checked })} 
              />
            </div>

            {settings.newsletterEnabled && (
              <div>
                <label className="font-semibold block mb-2">Digest Frequency</label>
                <select
                  value={settings.newsletterFrequency}
                  onChange={(e) => setSettings({ ...settings, newsletterFrequency: e.target.value })}
                  className="w-full max-w-sm p-3 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="daily">Daily</option>
                  <option value="every_3_days">Every 3 Days</option>
                  <option value="weekly">Weekly</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  The automated cron job runs daily at 8:00 AM, but will only send emails according to this frequency.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Ad Management Settings */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">Advertisement Configuration</h2>
          
          <div className="space-y-6">
            <div>
              <label className="font-semibold block mb-2">Global Ad Priority</label>
              <select
                value={settings.adPriority}
                onChange={(e) => setSettings({ ...settings, adPriority: e.target.value })}
                className="w-full max-w-sm p-3 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="adsense_first">Google AdSense First (Fallback to Custom Ads)</option>
                <option value="custom_first">Custom Ads First (Fallback to Google AdSense)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                This setting dictates the default ad type for sidebars, leaderboards, and sticky footers. 
                <strong> Note: In-article and in-feed ads are permanently set to Google AdSense only. Video interstitials are permanently set to Custom Ads only.</strong>
              </p>
            </div>

            <div>
              <label className="font-semibold block mb-2">Google AdSense Publisher ID</label>
              <input
                type="text"
                value={settings.adsenseClientId}
                onChange={(e) => setSettings({ ...settings, adsenseClientId: e.target.value })}
                placeholder="e.g. ca-pub-1234567890"
                className="w-full max-w-sm p-3 border border-border rounded-lg bg-background text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Your unique AdSense Publisher ID. The default test ID is ca-pub-xxxxxxxxxxxxxx.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

      </form>
    </div>
  );
}
