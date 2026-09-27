import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCircle, MapPin, Globe, Edit2, X, Check, Camera, Save } from 'lucide-react';
import { Twitter, Linkedin } from '../../components/BrandIcons';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import api from '../../services/api';

export default function AdminProfile() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [editForm, setEditForm] = useState({
    fullName: '', mobileNumber: '', bio: '', location: '', profilePicture: '', twitter: '', linkedin: '', website: ''
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEditForm(prev => ({ ...prev, profilePicture: res.data.url }));
    } catch (err) {
      console.error('Image upload failed', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (user) {
      setEditForm({
        fullName: user.fullName || '',
        mobileNumber: user.mobileNumber || '',
        bio: user.bio || '',
        location: user.location || '',
        profilePicture: user.profilePicture || '',
        twitter: user.socialLinks?.twitter || '',
        linkedin: user.socialLinks?.linkedin || '',
        website: user.socialLinks?.website || ''
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      const payload = {
        fullName: editForm.fullName,
        mobileNumber: editForm.mobileNumber,
        bio: editForm.bio,
        location: editForm.location,
        profilePicture: editForm.profilePicture,
        socialLinks: { twitter: editForm.twitter, linkedin: editForm.linkedin, website: editForm.website }
      };
      await api.put('/user/profile', payload);
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Admin Profile</h1>
          <p className="text-gray-500 mt-1">Manage your administrative account details</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} className="bg-red-600 hover:bg-red-700 text-white">
            <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-red-800 to-red-600 relative"></div>
        
        <div className="p-8 relative">
          {/* Avatar */}
          <div className="absolute -top-16 left-8">
            <div className="w-32 h-32 bg-white rounded-full p-1 shadow-md">
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {user.profilePicture && !user.profilePicture.includes('ui-avatars') ? (
                  <img src={user.profilePicture} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-20 h-20 text-gray-400" />
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-16">
            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.fullName}</h2>
                  <p className="text-gray-500">{user.email}</p>
                  
                  <div className="mt-4 space-y-3">
                    {user.location && (
                      <p className="flex items-center text-gray-600 text-sm">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {user.location}
                      </p>
                    )}
                    {user.mobileNumber && (
                      <p className="flex items-center text-gray-600 text-sm">
                        <span className="font-semibold w-24">Mobile:</span> {user.mobileNumber}
                      </p>
                    )}
                    <div className="flex gap-4 mt-4">
                      {user.socialLinks?.twitter && <a href={user.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-500"><Twitter className="w-5 h-5" /></a>}
                      {user.socialLinks?.linkedin && <a href={user.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-800"><Linkedin className="w-5 h-5" /></a>}
                      {user.socialLinks?.website && <a href={user.socialLinks.website} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-gray-800"><Globe className="w-5 h-5" /></a>}
                    </div>
                  </div>
                </div>
                
                {user.bio && (
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{user.bio}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Edit Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-gray-500">
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <Input value={editForm.fullName} onChange={(e) => setEditForm({...editForm, fullName: e.target.value})} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                    <Input value={editForm.mobileNumber} onChange={(e) => setEditForm({...editForm, mobileNumber: e.target.value})} className="bg-white" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      {editForm.profilePicture ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200">
                          <img src={editForm.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                          <UserCircle className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleImageUpload} 
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="bg-white"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {uploadingImage ? 'Uploading...' : 'Upload Image'}
                      </Button>
                      {editForm.profilePicture && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setEditForm(prev => ({ ...prev, profilePicture: '' }))}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Bio</label>
                    <Textarea value={editForm.bio} onChange={(e) => setEditForm({...editForm, bio: e.target.value})} className="bg-white min-h-[100px]" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <Input value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Twitter className="w-4 h-4 text-blue-400" /> Twitter</label>
                    <Input value={editForm.twitter} onChange={(e) => setEditForm({...editForm, twitter: e.target.value})} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Linkedin className="w-4 h-4 text-blue-700" /> LinkedIn</label>
                    <Input value={editForm.linkedin} onChange={(e) => setEditForm({...editForm, linkedin: e.target.value})} className="bg-white" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Globe className="w-4 h-4 text-gray-500" /> Website</label>
                    <Input value={editForm.website} onChange={(e) => setEditForm({...editForm, website: e.target.value})} className="bg-white" />
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button onClick={handleUpdateProfile} disabled={updating} className="bg-red-600 hover:bg-red-700 text-white">
                    {updating ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
