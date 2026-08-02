import React, { useState } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function BroadcastNotification() {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general',
    targetAudience: 'all',
    link: '',
    userId: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await api.post('/notifications', formData);
      setSuccess('Notification broadcasted successfully!');
      setFormData({
        title: '',
        message: '',
        type: 'general',
        targetAudience: 'all',
        link: '',
        userId: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold mb-6">Broadcast Notification</h1>
      
      {success && <div className="p-4 mb-6 bg-green-50 text-green-700 rounded-lg">{success}</div>}
      {error && <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <Input 
            required 
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="E.g., Breaking News: Major Event!"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea 
            required
            name="message"
            value={formData.message}
            onChange={handleChange}
            className="w-full flex min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Notification body text..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type (Icon & Color)</label>
            <select 
              name="type" 
              value={formData.type}
              onChange={handleChange}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="general">General (Bell)</option>
              <option value="breaking_news">Breaking News (Red Lightning)</option>
              <option value="subscription_alert">Subscription Alert (Gold Gem)</option>
              <option value="sports_update">Sports Update (Green Activity)</option>
              <option value="system_notice">System Notice (Blue Gear)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Target Audience</label>
            <select 
              name="targetAudience" 
              value={formData.targetAudience}
              onChange={handleChange}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Users</option>
              <option value="premium_only">Premium Users Only</option>
              <option value="free_only">Free Users Only</option>
              <option value="specific_user">Specific User (by ID)</option>
            </select>
          </div>
        </div>

        {formData.targetAudience === 'specific_user' && (
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <Input 
              required={formData.targetAudience === 'specific_user'}
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              placeholder="Enter User's MongoDB ObjectId"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Action Link (Optional)</label>
          <Input 
            name="link"
            value={formData.link}
            onChange={handleChange}
            placeholder="e.g., /subscriptions or https://example.com"
          />
          <p className="text-xs text-gray-500 mt-1">Where the user is taken when they click the notification.</p>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Broadcast Notification'}
        </Button>
      </form>
    </div>
  );
}
