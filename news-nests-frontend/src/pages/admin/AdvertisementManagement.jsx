import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Trash2, Edit, Plus, ExternalLink, BarChart2 } from 'lucide-react';

export default function AdvertisementManagement() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    companyName: '',
    imageUrl: '',
    linkUrl: '',
    position: 'leaderboard',
    isActive: true,
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const res = await api.get('/ads');
      setAds(res.data);
    } catch (error) {
      console.error('Failed to fetch ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (ad = null) => {
    if (ad) {
      setFormData({
        title: ad.title,
        companyName: ad.companyName,
        imageUrl: ad.imageUrl || '',
        videoUrl: ad.videoUrl || '',
        linkUrl: ad.linkUrl,
        position: ad.position,
        isActive: ad.isActive,
      });
      setEditingId(ad._id);
    } else {
      setFormData({
        title: '',
        companyName: '',
        imageUrl: '',
        videoUrl: '',
        linkUrl: '',
        position: 'leaderboard',
        isActive: true,
      });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/ads/${editingId}`, formData);
      } else {
        await api.post('/ads', formData);
      }
      setShowModal(false);
      fetchAds();
    } catch (error) {
      console.error('Error saving ad:', error);
      alert('Failed to save ad.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this ad?')) {
      try {
        await api.delete(`/ads/${id}`);
        fetchAds();
      } catch (error) {
        console.error('Error deleting ad:', error);
      }
    }
  };

  const toggleStatus = async (ad) => {
    try {
      await api.put(`/ads/${ad._id}`, { isActive: !ad.isActive });
      fetchAds();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Ads...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Advertisement Management</h1>
          <p className="text-muted-foreground">Manage your custom ad banners and track performance.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Create Ad
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-medium">Banner</th>
              <th className="p-4 font-medium">Details</th>
              <th className="p-4 font-medium">Position</th>
              <th className="p-4 font-medium">Stats</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ads.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">No advertisements found.</td>
              </tr>
            )}
            {ads.map(ad => (
              <tr key={ad._id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="w-32 h-16 bg-gray-100 rounded border overflow-hidden flex items-center justify-center relative group">
                    {ad.videoUrl ? (
                       <div className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">VIDEO AD</div>
                    ) : (
                       <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                    )}
                    <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white transition-opacity">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-gray-900">{ad.title}</div>
                  <div className="text-sm text-gray-500">{ad.companyName}</div>
                </td>
                <td className="p-4">
                  <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium capitalize">
                    {ad.position.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <BarChart2 className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">{ad.views}</span> views
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <ExternalLink className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium">{ad.clicks}</span> clicks
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => toggleStatus(ad)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${
                      ad.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        ad.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="p-4 text-right space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handleOpenModal(ad)}>
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button variant="outline" size="icon" className="hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(ad._id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Ad' : 'Create New Ad'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ad Title</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border rounded p-2 text-sm" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Company Name</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border rounded p-2 text-sm" 
                    value={formData.companyName} 
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Banner Image URL (Optional if using Video)</label>
                <input 
                  type="url" 
                  placeholder="https://example.com/banner.jpg"
                  className="w-full border rounded p-2 text-sm" 
                  value={formData.imageUrl} 
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Video URL (Optional .mp4 link)</label>
                <input 
                  type="url" 
                  placeholder="https://example.com/ad.mp4"
                  className="w-full border rounded p-2 text-sm" 
                  value={formData.videoUrl} 
                  onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Destination URL (Link)</label>
                <input 
                  type="url" 
                  required 
                  placeholder="https://advertiser-website.com"
                  className="w-full border rounded p-2 text-sm" 
                  value={formData.linkUrl} 
                  onChange={e => setFormData({...formData, linkUrl: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ad Position</label>
                <select 
                  className="w-full border rounded p-2 text-sm"
                  value={formData.position}
                  onChange={e => setFormData({...formData, position: e.target.value})}
                >
                  <option value="leaderboard">Leaderboard (Top of Page)</option>
                  <option value="in_feed">In-Feed (Between News Cards)</option>
                  <option value="in_article">In-Article (Inside Story text)</option>
                  <option value="sidebar">Sidebar (Next to content)</option>
                  <option value="interstitial">Interstitial (Full Screen Image overlay)</option>
                  <option value="video_interstitial">Video Interstitial (Every 8th Article)</option>
                  <option value="sticky_footer">Sticky Footer (Mobile bottom)</option>
                  <option value="everywhere">Everywhere (All slots)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">{editingId ? 'Save Changes' : 'Launch Ad'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
