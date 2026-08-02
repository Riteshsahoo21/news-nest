import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCircle, LogOut, FileEdit, ShieldCheck, Bookmark, Image as ImageIcon, PlaySquare, FileText, Star, MapPin, Link as LinkIcon, Globe, Edit2, X, Check, Camera, AlertCircle, CheckCircle, Radio } from 'lucide-react';
import { Twitter, Linkedin } from '../components/BrandIcons';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [toast, setToast] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '', mobileNumber: '', bio: '', location: '', profilePicture: '', twitter: '', linkedin: '', website: ''
  });

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

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
      showToast('Profile photo uploaded successfully!', 'success');
    } catch (err) {
      console.error('Image upload failed', err);
      showToast('Failed to upload image. Please try again.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (user) {
      setEditForm({
        fullName: user.fullName || '',
        username: user.username || user.fullName.toLowerCase().replace(/\s+/g, ''),
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

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const res = await api.get('/user/bookmarks');
        setBookmarks(res.data);
      } catch (err) {
        console.error('Failed to fetch bookmarks', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchBookmarks();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      const sanitizedUsername = editForm.username.replace(/\s+/g, '').toLowerCase();
      if (sanitizedUsername !== (user.username || '') && !usernameStatus?.canChange) {
        showToast(`You can only change your username once every 14 days. ${usernameStatus?.text || ''}`, 'error');
        setUpdating(false);
        return;
      }
      const payload = {
        fullName: editForm.fullName,
        username: editForm.username,
        mobileNumber: editForm.mobileNumber,
        bio: editForm.bio,
        location: editForm.location,
        profilePicture: editForm.profilePicture,
        socialLinks: { twitter: editForm.twitter, linkedin: editForm.linkedin, website: editForm.website }
      };
      await api.put('/user/profile', payload);
      await refreshUser();
      setIsEditing(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update profile', err);
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) {
    return null; // or redirect to login
  }

  const userRoles = user?.roles || (user?.role ? [user.role] : []);

  const getUsernameChangeStatus = () => {
    if (userRoles.includes('admin')) {
      return { canChange: true, text: 'Admin account (Unlimited instant edits)', color: 'text-emerald-500 font-semibold' };
    }
    // First time custom changers can change instantly
    if (!user?.hasCustomizedUsername || !user?.lastUsernameChange) {
      return { canChange: true, text: 'Available to change instantly (First-time custom change)', color: 'text-emerald-500 dark:text-emerald-400 font-semibold' };
    }
    const daysSinceChange = (Date.now() - new Date(user.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceChange >= 14) {
      return { canChange: true, text: 'Available now (14-day cooldown completed)', color: 'text-emerald-500 dark:text-emerald-400 font-semibold' };
    }
    const daysLeft = Math.ceil(14 - daysSinceChange);
    return { 
      canChange: false, 
      text: `Next change in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} (${daysLeft} days remaining of 14-day cooldown)`, 
      color: 'text-amber-500 dark:text-amber-400 font-semibold' 
    };
  };

  const usernameStatus = getUsernameChangeStatus();

  const calculateDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 md:pb-12 bg-background min-h-screen relative">
      {/* Toast Popup Message */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ duration: 0.35, type: "spring", stiffness: 400 }}
            className="fixed top-24 right-4 sm:right-8 z-[300] max-w-md w-[calc(100%-2rem)] sm:w-auto bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 backdrop-blur-md"
          >
            {toast.type === 'error' ? (
              <div className="p-2 bg-red-500/10 text-red-500 rounded-full shrink-0 mt-0.5 border border-red-500/20 shadow-sm">
                <AlertCircle className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 bg-green-500/10 text-green-500 rounded-full shrink-0 mt-0.5 border border-green-500/20 shadow-sm">
                <CheckCircle className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 mr-2">
              <h4 className="font-extrabold text-sm text-foreground mb-1">
                {toast.type === 'error' ? 'Notice' : 'Success'}
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Cover Header */}
      <div className="h-48 md:h-64 w-full bg-gradient-to-r from-slate-900 via-red-900 to-slate-900 relative rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-lg mb-16 md:mb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)} 
            className="absolute top-6 right-6 md:top-8 md:right-8 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 rounded-xl shadow-lg font-medium text-xs md:text-sm transition-all"
          >
            <Edit2 className="w-4 h-4 mr-2 text-red-400" /> Edit Profile
          </Button>
        ) : (
          <Button 
            onClick={() => setIsEditing(false)} 
            className="absolute top-6 right-6 md:top-8 md:right-8 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 rounded-xl shadow-lg font-medium text-xs md:text-sm transition-all"
          >
            <Bookmark className="w-4 h-4 mr-2 text-primary fill-primary/20" /> View Saved Collection
          </Button>
        )}
      </div>

      <div className="px-4 md:px-8 -mt-32 md:-mt-40 relative z-10 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Left Column: Profile Card */}
          <div className="w-full md:w-1/3 flex flex-col gap-6">
            <div className="bg-card border border-border/50 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-sm relative overflow-hidden">
              {/* Avatar */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-800 rounded-full animate-pulse blur-md opacity-50"></div>
                <div className="relative w-full h-full bg-card rounded-full border-4 border-background flex items-center justify-center shadow-inner overflow-hidden">
                  {user.profilePicture && !user.profilePicture.includes('ui-avatars') ? (
                    <img src={user.profilePicture} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-20 h-20 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              <h1 className="text-3xl font-bold font-serif mb-1 text-foreground">{user.fullName}</h1>
              <p className="text-muted-foreground font-medium text-sm mb-1">
                @{user.username || user.fullName.toLowerCase().replace(/\s+/g, '')}
              </p>
              <p className="text-muted-foreground mb-4 text-sm">{user.email}</p>

              {user.location && !isEditing && (
                <p className="flex items-center justify-center text-sm text-muted-foreground mb-6">
                  <MapPin className="w-4 h-4 mr-1 opacity-70" /> {user.location}
                </p>
              )}
              
              {/* Badges */}
              <div className="flex flex-col gap-3">
                {user.isPremium && (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-800 dark:text-yellow-500 px-4 py-2 rounded-xl text-sm font-bold border border-yellow-200 dark:border-yellow-900/50 shadow-sm">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> Premium Member
                    </div>
                    {user.subscriptionExpiry && (
                      <span className="text-[11px] font-bold tracking-wide uppercase text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-100 dark:border-yellow-900/50">
                        {calculateDaysLeft(user.subscriptionExpiry)} days remaining
                      </span>
                    )}
                  </div>
                )}
                
                {userRoles.some(r => ['admin'].includes(r)) && (
                  <div className="inline-flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 rounded-xl text-sm font-bold border border-red-200 dark:border-red-900/30">
                    System Administrator
                  </div>
                )}
                
                {userRoles.includes('reporter') && !userRoles.some(r => ['admin', 'editor'].includes(r)) && (
                  <div className="inline-flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-xl text-sm font-bold border border-purple-200 dark:border-purple-900/30">
                    Reporter Account
                  </div>
                )}
                
                {userRoles.includes('editor') && !userRoles.some(r => ['admin'].includes(r)) && (
                  <div className="inline-flex items-center justify-center bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-xl text-sm font-bold border border-orange-200 dark:border-orange-900/30">
                    Editor Account
                  </div>
                )}
              </div>

              {user.bio && !isEditing && (
                <div className="mt-6 pt-6 border-t border-border/50 text-left">
                  <p className="text-sm text-foreground/80 leading-relaxed italic">"{user.bio}"</p>
                </div>
              )}
              
              {/* Quick Actions & Navigation */}
              <div className="mt-6 pt-6 border-t border-border/50 flex flex-col gap-4">
                {/* Primary Action Row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <Button 
                    variant={isEditing ? "default" : "outline"} 
                    onClick={() => setIsEditing(!isEditing)}
                    className="w-full justify-center h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all border-border/80"
                  >
                    <Edit2 className="w-4 h-4 mr-1.5 shrink-0" />
                    {isEditing ? "View Saved" : "Edit Profile"}
                  </Button>
                  <Link to={`/user/${user._id}`} className="w-full">
                    <Button variant="outline" className="w-full justify-center h-11 rounded-xl text-xs sm:text-sm font-semibold hover:bg-muted/60 border-border/80 transition-all">
                      <Globe className="w-4 h-4 mr-1.5 text-blue-500 shrink-0" />
                      Public Page
                    </Button>
                  </Link>
                </div>

                {/* Creator & Admin Workspace */}
                {userRoles.some(r => ['reporter', 'admin', 'editor'].includes(r)) && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-left px-1">Creator Workspace</span>
                    <div className="flex flex-col gap-2">
                      {userRoles.some(r => ['reporter', 'admin', 'editor'].includes(r)) && (
                        <Link to="/reporter/dashboard" className="w-full">
                          <Button variant="outline" className="w-full justify-start h-11 rounded-xl hover:bg-primary/5 hover:border-primary/30 text-sm font-medium border-border/80 transition-all">
                            <FileEdit className="w-4 h-4 mr-3 text-primary shrink-0" />
                            Reporter Articles
                          </Button>
                        </Link>
                      )}
                      {userRoles.some(r => ['editor', 'admin'].includes(r)) && (
                        <Link to="/editor/dashboard" className="w-full">
                          <Button variant="outline" className="w-full justify-start h-11 rounded-xl hover:bg-purple-500/5 hover:border-purple-500/30 text-sm font-medium border-border/80 transition-all">
                            <ShieldCheck className="w-4 h-4 mr-3 text-purple-600 dark:text-purple-400 shrink-0" />
                            Editor Dashboard
                          </Button>
                        </Link>
                      )}
                      {(userRoles.some(r => ['admin', 'editor'].includes(r)) || (userRoles.includes('reporter') && user?.canManageLiveBlogs)) && (
                        <Link to="/live-blog-studio" className="w-full">
                          <Button variant="outline" className="w-full justify-start h-11 rounded-xl hover:bg-rose-500/5 hover:border-rose-500/30 text-sm font-medium border-border/80 transition-all text-red-600 dark:text-red-400 font-semibold">
                            <Radio className="w-4 h-4 mr-3 text-red-600 dark:text-red-400 animate-pulse shrink-0" />
                            Live Blog Studio
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Account & Membership Plan */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-left px-1">Account & Plan</span>
                  <div className="flex flex-col gap-2">
                    {!user.isPremium ? (
                      <Link to="/subscriptions" className="w-full">
                        <Button className="w-full justify-start h-11 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white shadow-md text-sm font-semibold border-0 transition-all">
                          <Star className="w-4 h-4 mr-3 fill-white shrink-0" />
                          Upgrade to Premium
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/subscriptions" className="w-full">
                        <Button variant="outline" className="w-full justify-start h-11 rounded-xl hover:bg-yellow-500/5 hover:border-yellow-500/30 text-sm font-medium border-border/80 transition-all">
                          <Star className="w-4 h-4 mr-3 text-yellow-500 fill-yellow-500 shrink-0" />
                          Manage Subscription
                        </Button>
                      </Link>
                    )}
                    {user.isPremium && !userRoles.includes('reporter') && !userRoles.includes('admin') && (
                      <Link to="/apply-reporter" className="w-full">
                        <Button variant="outline" className="w-full justify-start h-11 rounded-xl hover:bg-blue-500/5 hover:border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm font-medium border-border/80 transition-all">
                          <FileText className="w-4 h-4 mr-3 shrink-0" />
                          Apply for Reporter
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Sign Out Action */}
                <div className="pt-2 mt-1 border-t border-border/40">
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout} 
                    className="w-full justify-start h-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive font-medium text-sm transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3 shrink-0" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Edit Form OR Bookmarks & Activity */}
          <div className="w-full md:w-2/3 flex flex-col gap-4 md:pt-2">
            
            {/* Sleek Navigation Tab Bar */}
            <div className="flex items-center gap-2 p-1.5 bg-card border border-border/70 rounded-2xl shadow-sm w-full sm:w-fit overflow-x-auto">
              <button
                onClick={() => setIsEditing(false)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                  !isEditing 
                    ? 'bg-primary text-primary-foreground shadow-md font-bold' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Bookmark className="w-4 h-4 shrink-0 fill-current" />
                Saved Collection
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${!isEditing ? 'bg-white/20 text-white font-bold' : 'bg-muted text-muted-foreground font-semibold'}`}>
                  {bookmarks.length}
                </span>
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                  isEditing 
                    ? 'bg-primary text-primary-foreground shadow-md font-bold' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Edit2 className="w-4 h-4 shrink-0" />
                Account & Profile Settings
              </button>
            </div>

            {isEditing ? (
              <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8 pb-4 border-b">
                  <h2 className="text-2xl font-bold font-serif">Edit Profile</h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input value={editForm.fullName} onChange={(e) => setEditForm({...editForm, fullName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="text-sm font-medium">Username</label>
                      <span className={`text-[11px] ${usernameStatus?.color || 'text-muted-foreground'}`}>
                        • {usernameStatus?.text || 'Changeable once every 14 days'}
                      </span>
                    </div>
                    <Input 
                      value={editForm.username} 
                      onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                      className={!usernameStatus?.canChange && editForm.username !== user?.username ? "border-amber-500 ring-1 ring-amber-500/30" : ""}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Mobile Number</label>
                    <Input value={editForm.mobileNumber} onChange={(e) => setEditForm({...editForm, mobileNumber: e.target.value})} placeholder="+1 234 567 890" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      {editForm.profilePicture ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden border">
                          <img src={editForm.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border">
                          <UserCircle className="w-8 h-8 text-muted-foreground" />
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
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {uploadingImage ? 'Uploading...' : 'Upload Image'}
                      </Button>
                      {editForm.profilePicture && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setEditForm(prev => ({ ...prev, profilePicture: '' }))}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Bio</label>
                    <Textarea value={editForm.bio} onChange={(e) => setEditForm({...editForm, bio: e.target.value})} placeholder="Tell us about yourself..." className="h-24" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})} placeholder="City, Country" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><Twitter className="w-4 h-4 text-blue-400" /> Twitter URL</label>
                    <Input value={editForm.twitter} onChange={(e) => setEditForm({...editForm, twitter: e.target.value})} placeholder="https://twitter.com/..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><Linkedin className="w-4 h-4 text-blue-700" /> LinkedIn URL</label>
                    <Input value={editForm.linkedin} onChange={(e) => setEditForm({...editForm, linkedin: e.target.value})} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium flex items-center gap-2"><Globe className="w-4 h-4 text-slate-500" /> Personal Website</label>
                    <Input value={editForm.website} onChange={(e) => setEditForm({...editForm, website: e.target.value})} placeholder="https://..." />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={handleUpdateProfile} disabled={updating}>
                    {updating ? 'Saving...' : <><Check className="w-4 h-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </div>
            ) : (
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold font-serif flex items-center gap-3">
                  <Bookmark className="w-6 h-6 text-primary fill-primary/20" />
                  Saved Collection
                </h2>
                <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {bookmarks.length} Items
                </span>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : bookmarks.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border/60 rounded-2xl bg-muted/20">
                  <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-bold mb-2">No bookmarks yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Save articles, videos, and galleries to your collection to read them later.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookmarks.map(item => (
                    <Link 
                      key={item._id} 
                      to={
                        item.type === 'article' ? `?articleId=${item.slug || item._id}` :
                        item.type === 'video' ? `?videoId=${item._id}` :
                        `?galleryId=${item._id}`
                      }
                      className="group flex flex-col bg-background border border-border/60 rounded-2xl overflow-hidden hover:shadow-lg hover:border-border transition-all duration-300"
                    >
                      <div className="relative h-40 w-full bg-muted overflow-hidden">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/50">
                            {item.type === 'video' ? <PlaySquare className="w-10 h-10 text-muted-foreground/30" /> : <FileText className="w-10 h-10 text-muted-foreground/30" />}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                        
                        {/* Type Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-black/60 text-white backdrop-blur-md">
                            {item.type}
                          </span>
                        </div>
                        
                        {/* Category Label */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 block">
                            {item.category}
                          </span>
                          <h3 className="font-bold text-sm text-white leading-tight line-clamp-2 shadow-sm">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      
                      <div className="px-4 py-3 bg-card flex justify-between items-center text-xs text-muted-foreground">
                        <span>Saved {new Date(item.createdAt).toLocaleDateString()}</span>
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Bookmark className="w-3 h-3 fill-current" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
