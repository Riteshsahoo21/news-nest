import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Radio, 
  Plus, 
  Send, 
  Edit3, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Clock, 
  Trophy, 
  BarChart2, 
  Image as ImageIcon, 
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sparkles,
  Settings,
  Upload,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Memoized video players ensure React state updates (posting news, editing title, receiving API data) NEVER trigger an iframe reload or WebRTC re-initialization
const MemoizedWebRTCRoom = React.memo(({ streamUrl }) => {
  if (!streamUrl) return null;
  return (
    <iframe
      src={`https://vdo.ninja/?push=${streamUrl}&webcam&autostart=1&quality=1&clean=1`}
      allow="camera; microphone; fullscreen; display-capture"
      className="w-full aspect-video border-0 bg-black"
      title="WebRTC Camera Broadcast"
    />
  );
}, (prevProps, nextProps) => prevProps.streamUrl === nextProps.streamUrl);

const MemoizedYouTubePreview = React.memo(({ streamUrl }) => {
  if (!streamUrl) return null;
  const videoId = (streamUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/) || [])[1] || streamUrl;
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`}
      className="w-full h-full border-0"
      title="YouTube Live Studio Preview Monitor"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}, (prevProps, nextProps) => prevProps.streamUrl === nextProps.streamUrl);

export default function LiveBlogStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create', 'desk'
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [mobileDeskTab, setMobileDeskTab] = useState('update'); // 'update', 'stream', 'score', 'config'

  // Form states for Create New Event
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Sports');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [enableMatchScore, setEnableMatchScore] = useState(true);
  const [showVSTeams, setShowVSTeams] = useState(true);
  const [team1Name, setTeam1Name] = useState('');
  const [team1Score, setTeam1Score] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  const [matchInfo, setMatchInfo] = useState('');
  const [customStats, setCustomStats] = useState([
    { label: 'Overs & Balls', value: '0.0 ov' },
    { label: 'Current Batsman', value: 'TBD (0*)' }
  ]);
  const [enablePoll, setEnablePoll] = useState(true);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOpt1, setPollOpt1] = useState('');
  const [pollOpt2, setPollOpt2] = useState('');

  // Form states for Live Broadcast Desk
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [updateImageUrl, setUpdateImageUrl] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [updatingScore, setUpdatingScore] = useState(false);

  // Live Stream Configuration States
  const [streamType, setStreamType] = useState('none'); // 'none', 'youtube', 'webrtc'
  const [streamUrl, setStreamUrl] = useState('');
  const [isStreamActive, setIsStreamActive] = useState(false);

  // Edit score & stream states for desk
  const [deskShowVSTeams, setDeskShowVSTeams] = useState(true);
  const [deskTeam1Name, setDeskTeam1Name] = useState('');
  const [deskTeam2Name, setDeskTeam2Name] = useState('');
  const [deskTeam1Score, setDeskTeam1Score] = useState('');
  const [deskTeam2Score, setDeskTeam2Score] = useState('');
  const [deskMatchInfo, setDeskMatchInfo] = useState('');
  const [deskCustomStats, setDeskCustomStats] = useState([]);
  const [deskStreamType, setDeskStreamType] = useState('none');
  const [deskStreamUrl, setDeskStreamUrl] = useState('');
  const [deskIsStreamActive, setDeskIsStreamActive] = useState(false);
  const [updatingStream, setUpdatingStream] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  const handleUpdateStreamConfig = async () => {
    try {
      setUpdatingStream(true);
      const res = await api.put(`/live-blogs/${selectedBlog._id}`, {
        streamType: deskStreamType,
        streamUrl: deskStreamUrl,
        isStreamActive: deskIsStreamActive
      });
      setSelectedBlog(res.data.liveBlog);
      showToast('📡 Live Stream synchronized! Readers polling across all mobile networks will see the video feed immediately.', 'success');
    } catch (err) {
      console.error('Error updating live stream settings:', err);
      showToast('Failed to synchronize stream settings.', 'error');
    } finally {
      setUpdatingStream(false);
    }
  };

  const handleToggleStreamPause = async () => {
    const newStatus = !deskIsStreamActive;
    setDeskIsStreamActive(newStatus);
    try {
      setUpdatingStream(true);
      const res = await api.put(`/live-blogs/${selectedBlog._id}`, {
        streamType: deskStreamType,
        streamUrl: deskStreamUrl,
        isStreamActive: newStatus
      });
      setSelectedBlog(res.data.liveBlog);
      showToast(newStatus 
        ? '▶️ Stream Resumed! Your WebRTC camera feed is now LIVE again for all readers.' 
        : '⏸️ Stream Paused! Readers currently watching will see a "Live Broadcast Temporarily Paused" screen until you resume.', 'success');
    } catch (err) {
      console.error('Error toggling pause state:', err);
      showToast('Failed to update stream pause status.', 'error');
    } finally {
      setUpdatingStream(false);
    }
  };

  const handleGenerateWebRtcRoom = (isDesk = false) => {
    const randomId = `newsnests_${Math.random().toString(36).substring(2, 8)}_${Date.now()}`;
    if (isDesk) {
      setDeskStreamUrl(randomId);
      setDeskStreamType('webrtc');
      setDeskIsStreamActive(true);
      showToast(`🎙️ Free WebRTC Camera Room Generated: ${randomId}\nYour webcam preview is loaded below! Click "Sync & Broadcast Live Feed" to publish to readers.`, 'success');
    } else {
      setStreamUrl(randomId);
      setStreamType('webrtc');
      setIsStreamActive(true);
      showToast(`🎙️ Free WebRTC Camera Room Generated: ${randomId}\nWhen you launch this live event, your camera studio will automatically open in the desk.`, 'success');
    }
  };

  const handleAddCustomStat = (isDesk = false) => {
    if (isDesk) {
      setDeskCustomStats([...deskCustomStats, { label: '', value: '' }]);
    } else {
      setCustomStats([...customStats, { label: '', value: '' }]);
    }
  };

  const handleRemoveCustomStat = (idx, isDesk = false) => {
    if (isDesk) {
      setDeskCustomStats(deskCustomStats.filter((_, i) => i !== idx));
    } else {
      setCustomStats(customStats.filter((_, i) => i !== idx));
    }
  };

  const handleCustomStatChange = (idx, field, val, isDesk = false) => {
    if (isDesk) {
      const updated = [...deskCustomStats];
      updated[idx] = { ...updated[idx], [field]: val };
      setDeskCustomStats(updated);
    } else {
      const updated = [...customStats];
      updated[idx] = { ...updated[idx], [field]: val };
      setCustomStats(updated);
    }
  };

  const applySportPreset = (sport, isDesk = false) => {
    let presets = [];
    if (sport === 'cricket') {
      presets = [
        { label: 'Overs & Balls', value: '42.3 ov (REQ: 7.20)' },
        { label: 'Run Rate (CRR)', value: 'CRR: 5.82' },
        { label: 'Current Batsman 1', value: 'V. Kohli 84* (68)' },
        { label: 'Current Batsman 2', value: 'R. Sharma 45 (32)' },
        { label: 'Current Bowler', value: 'P. Cummins 2/42 (8 ov)' },
        { label: 'Toss / Status', value: 'Australia won toss & chose to bowl' }
      ];
    } else if (sport === 'football') {
      presets = [
        { label: 'Possession', value: '54% - 46%' },
        { label: 'Shots (On Target)', value: '12 (8) - 7 (3)' },
        { label: 'Corners', value: '6 - 2' },
        { label: 'Cards & Discipline', value: '2 Yellow, 0 Red' }
      ];
    } else if (sport === 'politics') {
      presets = [
        { label: 'Topic / Bill', value: 'Public Examinations Amendment' },
        { label: 'Venue / House', value: 'Parliament / Lok Sabha' },
        { label: 'Debate Status', value: 'Live Floor Discussion' },
        { label: 'Key Speaker', value: 'Union Minister' }
      ];
    } else if (sport === 'economy') {
      presets = [
        { label: 'Market Index', value: 'Nifty 50: 24,500 (+1.2%)' },
        { label: 'Sector Leader', value: 'Banking & IT Stocks' },
        { label: 'Market Trend', value: 'Strong Bullish Momentum' }
      ];
    } else if (sport === 'tennis') {
      presets = [
        { label: 'Set Scores', value: '6-4, 3-6, 5-2' },
        { label: 'Aces / Double Faults', value: '14 Aces | 2 DF' },
        { label: 'Break Points Won', value: '4/7 (57%)' }
      ];
    }
    if (isDesk) {
      setDeskCustomStats(presets);
    } else {
      setCustomStats(presets);
    }
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    const isSports = ['Sports', 'Football', 'Cricket'].includes(val);
    setShowVSTeams(isSports);
    if (val === 'Politics') {
      applySportPreset('politics', false);
      setMatchInfo('Live Parliamentary Coverage');
    } else if (val === 'Cricket') {
      applySportPreset('cricket', false);
      setMatchInfo('First Innings in progress');
    } else if (val === 'Football') {
      applySportPreset('football', false);
      setMatchInfo('Live First Half');
    } else if (val === 'Technology' || val === 'Breaking' || val === 'Entertainment') {
      setCustomStats([
        { label: 'Key Highlight', value: 'Major development incoming' },
        { label: 'Location / Source', value: 'Official Newsroom Verification' }
      ]);
      setMatchInfo('Live News stream');
    }
  };
  const [uploadingUpdateImg, setUploadingUpdateImg] = useState(false);

  // Edit Initial Event Details States
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Sports');
  const [editTags, setEditTags] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMainImageUrl, setEditMainImageUrl] = useState('');
  const [uploadingEditCover, setUploadingEditCover] = useState(false);

  const handleEditCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      setUploadingEditCover(true);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEditMainImageUrl(res.data.url);
    } catch (err) {
      console.error('Cloudinary cover upload failed:', err);
      showToast(err.response?.data?.error || 'Failed to upload image to Cloudinary', 'error');
    } finally {
      setUploadingEditCover(false);
    }
  };

  const handleSaveEditedDetails = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDescription.trim()) return showToast('Title and description cannot be empty!', 'error');
    try {
      const res = await api.put(`/live-blogs/${selectedBlog._id}`, {
        title: editTitle,
        category: editCategory,
        tags: editTags,
        description: editDescription,
        mainImageUrl: editMainImageUrl
      });
      setSelectedBlog(res.data.liveBlog);
      setIsEditingDetails(false);
      showToast('✅ Initial event details updated! Readers polling every 5 seconds will immediately see the new title, category, cover, and description.', 'success');
      fetchLiveBlogs();
    } catch (err) {
      console.error('Error updating details:', err);
      showToast(err.response?.data?.error || 'Failed to update event details', 'error');
    }
  };

  const handleCoverImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      setUploadingCover(true);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMainImageUrl(res.data.url);
    } catch (err) {
      console.error('Cloudinary cover upload failed:', err);
      showToast(err.response?.data?.error || 'Failed to upload cover image to Cloudinary', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUpdateImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      setUploadingUpdateImg(true);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUpdateImageUrl(res.data.url);
    } catch (err) {
      console.error('Cloudinary attachment upload failed:', err);
      showToast(err.response?.data?.error || 'Failed to upload attachment to Cloudinary', 'error');
    } finally {
      setUploadingUpdateImg(false);
    }
  };

  const userRoles = user?.roles || [user?.role || ''];
  const isAdminOrEditor = userRoles.some(r => ['admin', 'editor'].includes(r));
  const hasAccess = isAdminOrEditor || (userRoles.includes('reporter') && user?.canManageLiveBlogs === true);

  useEffect(() => {
    if (hasAccess) {
      fetchLiveBlogs();
    } else {
      setLoading(false);
    }
  }, [hasAccess]);

  const fetchLiveBlogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/live-blogs?status=all');
      setBlogs(res.data || []);
    } catch (err) {
      console.error('Error fetching live blogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const matchStatus = enableMatchScore ? {
        team1: showVSTeams ? { name: team1Name || 'Team 1', score: team1Score || '0' } : { name: '', score: '' },
        team2: showVSTeams ? { name: team2Name || 'Team 2', score: team2Score || '0' } : { name: '', score: '' },
        matchInfo: matchInfo || (category === 'Politics' ? 'Live Parliament Telemetry' : 'Live Event'),
        customStats: customStats.filter(s => s.label && s.label.trim() !== '')
      } : undefined;

      const poll = enablePoll ? {
        question: pollQuestion || 'Who do you agree with?',
        options: [
          { text: pollOpt1 || 'Option 1', votes: 0 },
          { text: pollOpt2 || 'Option 2', votes: 0 }
        ]
      } : undefined;

      const res = await api.post('/live-blogs', {
        title,
        category,
        tags,
        author: user?.fullName || 'Live Editor',
        description,
        mainImageUrl,
        streamType,
        streamUrl,
        isStreamActive,
        matchStatus,
        poll
      });

      showToast('🎉 Live Blog created! Opening Broadcast Desk...', 'success');
      const created = res.data.liveBlog;
      setBlogs([created, ...blogs]);
      openDesk(created);
    } catch (err) {
      console.error('Error creating live blog:', err);
      showToast(err.response?.data?.error || 'Failed to create live blog', 'error');
    }
  };

  const openDesk = (blog) => {
    setSelectedBlog(blog);
    const t1Name = blog.matchStatus?.team1?.name || '';
    const t2Name = blog.matchStatus?.team2?.name || '';
    const isSportsCat = ['Sports', 'Football', 'Cricket'].includes(blog.category);
    const hasActiveVS = Boolean(t1Name && t1Name.trim() !== '' && (isSportsCat || (t1Name !== 'Team 1' && t1Name !== '0')));
    setDeskShowVSTeams(hasActiveVS);
    setDeskTeam1Name(t1Name || 'Team 1');
    setDeskTeam2Name(t2Name || 'Team 2');
    setDeskTeam1Score(blog.matchStatus?.team1?.score || '');
    setDeskTeam2Score(blog.matchStatus?.team2?.score || '');
    setDeskMatchInfo(blog.matchStatus?.matchInfo || '');
    setDeskCustomStats(blog.matchStatus?.customStats || []);
    setDeskStreamType(blog.streamType || 'none');
    setDeskStreamUrl(blog.streamUrl || '');
    setDeskIsStreamActive(blog.isStreamActive === true);
    setEditTitle(blog.title || '');
    setEditCategory(blog.category || 'Sports');
    setEditTags(Array.isArray(blog.tags) ? blog.tags.join(', ') : (blog.tags || ''));
    setEditDescription(blog.description || '');
    setEditMainImageUrl(blog.mainImageUrl || '');
    setIsEditingDetails(false);
    setMobileDeskTab('update');
    setActiveTab('desk');
  };

  const handleBroadcastUpdate = async (e) => {
    e.preventDefault();
    if (!updateContent.trim()) return showToast('Please enter update content!', 'error');
    
    try {
      setBroadcasting(true);
      const res = await api.post(`/live-blogs/${selectedBlog._id}/updates`, {
        title: updateTitle.trim() || 'UPDATE',
        content: updateContent,
        imageUrl: updateImageUrl.trim()
      });

      setSelectedBlog(res.data.liveBlog);
      setUpdateTitle('');
      setUpdateContent('');
      setUpdateImageUrl('');
      showToast('⚡ Update broadcasted! Readers polling every 5 seconds will receive this instantly.', 'success');
      fetchLiveBlogs();
    } catch (err) {
      console.error('Error broadcasting update:', err);
      showToast(err.response?.data?.error || 'Failed to broadcast update', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleUpdateScoreboard = async () => {
    try {
      setUpdatingScore(true);
      const updatedMatchStatus = {
        ...selectedBlog.matchStatus,
        team1: deskShowVSTeams ? { name: deskTeam1Name || 'Team 1', score: deskTeam1Score } : { name: '', score: '' },
        team2: deskShowVSTeams ? { name: deskTeam2Name || 'Team 2', score: deskTeam2Score } : { name: '', score: '' },
        matchInfo: deskMatchInfo,
        customStats: deskCustomStats.filter(s => s.label && s.label.trim() !== '')
      };

      const res = await api.put(`/live-blogs/${selectedBlog._id}`, {
        matchStatus: updatedMatchStatus
      });

      setSelectedBlog(res.data.liveBlog);
      showToast('📊 Live Telemetry & Metrics updated instantly!', 'success');
    } catch (err) {
      console.error('Error updating scoreboard:', err);
      showToast(err.response?.data?.error || 'Failed to update score', 'error');
    } finally {
      setUpdatingScore(false);
    }
  };

  const handleToggleEventStatus = async () => {
    try {
      const newStatus = !selectedBlog.isLive;
      const res = await api.put(`/live-blogs/${selectedBlog._id}`, { isLive: newStatus });
      setSelectedBlog(res.data.liveBlog);
      showToast(newStatus ? '🔴 Event reopened as LIVE!' : '⬛ Event marked as CONCLUDED & ARCHIVED.', 'success');
      fetchLiveBlogs();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-gray-900 mb-2">Live Blog Studio Access Restricted</h2>
        <p className="text-gray-600 mb-6 max-w-lg mx-auto leading-relaxed">
          You currently do not have authorization to access the Live Blog Broadcast Studio. If you are a platform Reporter, an Administrator must toggle <strong>"Grant Live Blog Access"</strong> for your account from the Admin Panel.
        </p>
        <Link to="/profile" className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-all shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Return to Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-[#0b0e14] min-h-screen pb-20 transition-colors duration-200 relative">
      {/* Floating Non-Blocking Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] max-w-md bg-[#0c1421] text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-start gap-3.5 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`p-2.5 rounded-xl ${toastMessage.type === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
            {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-extrabold uppercase tracking-wider mb-1 ${toastMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {toastMessage.type === 'error' ? '⚠️ Broadcast Error' : '⚡ Broadcast Notification'}
            </div>
            <p className="text-xs text-gray-200 font-medium leading-relaxed whitespace-pre-line">
              {toastMessage.message}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Top Banner & Navigation */}
      <div className="bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-red-600 to-rose-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0">
                <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight font-serif flex items-center gap-1.5 sm:gap-2">
                  <span>Live Studio</span>
                  <span className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase shrink-0">
                    Broadcast Desk
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">Real-time reporting & reader updates</p>
              </div>
            </div>
            {selectedBlog && (
              <span className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-red-600 text-white animate-pulse shadow-xs shrink-0">
                ● LIVE DESK
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setActiveTab('list'); setSelectedBlog(null); }}
              className={`flex-1 sm:flex-initial text-center px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'list' && !selectedBlog ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm' : 'text-gray-600 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              All Events ({blogs.length})
            </button>
            <button
              onClick={() => { setActiveTab('create'); setSelectedBlog(null); }}
              className={`flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm ${activeTab === 'create' ? 'bg-red-600 text-white shadow-red-500/25' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50'}`}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Create Event
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-3" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Loading Live Blog Events...</p>
          </div>
        ) : activeTab === 'list' ? (
          /* EVENT LISTING TAB */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white font-serif">Your Managed Live Broadcasts</h2>
              <button onClick={fetchLiveBlogs} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-1.5 text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {blogs.length === 0 ? (
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
                <Sparkles className="w-10 h-10 text-rose-500 mx-auto mb-3 animate-bounce" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">No Live Blogs Yet</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">Create your first live blog to start broadcasting breaking news, matches, or election updates in real time!</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition-all shadow-md shadow-red-600/20 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create First Live Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map(blog => (
                  <div key={blog._id} className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col justify-between group">
                    <div>
                      <div className="h-40 bg-gray-900 relative overflow-hidden">
                        {blog.mainImageUrl ? (
                          <img src={blog.mainImageUrl} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500">
                            <Radio className="w-12 h-12 opacity-30" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-md uppercase tracking-wider ${blog.isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-gray-300'}`}>
                            ● {blog.isLive ? 'LIVE' : 'ENDED'}
                          </span>
                          <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-gray-900 dark:text-gray-100 text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                            {blog.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base line-clamp-2 mb-2 font-serif group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                          {blog.title}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                          {blog.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {blog.updates?.length || 0} Updates
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                            {blog.matchStatus?.team1?.score && `${blog.matchStatus.team1.score} - ${blog.matchStatus.team2.score}`}
                            {!blog.matchStatus?.team1?.score && 'No Match Score'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3.5 sm:p-4 bg-gray-50 dark:bg-[#161d2a] border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                      <Link
                        to={`/live-blogs`}
                        className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs transition-all shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5 text-red-600" /> View Feed
                      </Link>
                      <button
                        onClick={() => openDesk(blog)}
                        className="flex-1 sm:flex-initial justify-center bg-gradient-to-r from-gray-900 to-slate-900 dark:from-red-600 dark:to-rose-600 text-white hover:bg-red-600 dark:hover:bg-red-500 text-xs font-extrabold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Radio className="w-3.5 h-3.5 animate-pulse text-red-500 dark:text-white" /> Enter Studio →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'create' ? (
          /* CREATE NEW LIVE EVENT TAB */
          <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-bold font-serif text-gray-900">Create Live Blog Broadcast</h2>
                <p className="text-gray-500 text-sm mt-1">Setup your live story, match scorecard, and opening interactive poll.</p>
              </div>
              <button
                onClick={() => setActiveTab('list')}
                className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-2xs"
                title="Return to your event directory"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Event List
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Event Headline / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., India vs Australia - 2nd ODI or Real Madrid vs Barcelona"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold text-gray-800"
                  >
                    <option value="Sports">Sports</option>
                    <option value="Football">Football</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Politics">Politics</option>
                    <option value="Breaking">Breaking</option>
                    <option value="Technology">Technology</option>
                    <option value="Entertainment">Entertainment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. sports, live, update"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Description / Summary *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Provide a quick overview of what this live coverage is tracking..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Cover Image (URL or Cloudinary Upload) (Optional)</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-... (Or upload image below)"
                    value={mainImageUrl}
                    onChange={(e) => setMainImageUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  <span className="text-xs font-extrabold text-gray-400 self-center uppercase hidden sm:inline">OR</span>
                  <label className={`cursor-pointer bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs shrink-0 ${uploadingCover ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin text-red-600" /> : <Upload className="w-4 h-4 text-red-600" />}
                    <span>{uploadingCover ? 'Uploading to Cloudinary...' : 'Upload Cover Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageUpload}
                      className="hidden"
                      disabled={uploadingCover}
                    />
                  </label>
                </div>
                {mainImageUrl && (
                  <div className="mt-3 relative inline-block w-48 h-28 rounded-2xl overflow-hidden border border-gray-200 shadow-sm group bg-gray-100">
                    <img src={mainImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMainImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full transition-all shadow-md"
                      title="Remove cover image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase backdrop-blur-xs">Cover Preview</span>
                  </div>
                )}
              </div>

              {/* Free Scalable Live Video Stream Config */}
              <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white p-6 rounded-2xl shadow-md border border-gray-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2 font-serif font-bold text-white">
                    <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                    <span>Live Video Stream Setup (100% Free & Scalable)</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => { setStreamType('none'); setIsStreamActive(false); }}
                      className={`p-3 rounded-2xl border text-left transition-all ${streamType === 'none' ? 'bg-white/10 border-red-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
                    >
                      <div className="font-bold text-xs mb-0.5">💬 Text & Updates Only</div>
                      <p className="text-[10px] text-gray-500">No video feed initially</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStreamType('youtube'); setIsStreamActive(true); }}
                      className={`p-3 rounded-2xl border text-left transition-all ${streamType === 'youtube' ? 'bg-red-950/80 border-red-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
                    >
                      <div className="font-bold text-xs text-red-400 mb-0.5">📺 YouTube Live (10+ Lakh Viewers)</div>
                      <p className="text-[10px] text-gray-400">$0 Hosting. Massive scale</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateWebRtcRoom(false)}
                      className={`p-3 rounded-2xl border text-left transition-all ${streamType === 'webrtc' ? 'bg-emerald-950/80 border-emerald-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
                    >
                      <div className="font-bold text-xs text-emerald-400 mb-0.5">🎙️ Instant WebRTC Camera</div>
                      <p className="text-[10px] text-gray-400">Direct webcam streaming</p>
                    </button>
                  </div>
                  {streamType === 'youtube' && (
                    <div className="bg-black/60 p-3 rounded-xl border border-gray-800">
                      <label className="block text-xs font-bold text-red-400 mb-1">YouTube Live Stream URL or Video ID</label>
                      <input
                        type="text"
                        placeholder="e.g., https://www.youtube.com/watch?v=LiveVideoId or LiveVideoId"
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 rounded-lg text-white font-mono text-xs border border-gray-700"
                      />
                    </div>
                  )}
                  {streamType === 'webrtc' && streamUrl && (
                    <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-600/50 text-emerald-300 text-xs font-mono">
                      ✅ WebRTC Room ID generated: <strong>{streamUrl}</strong>. Upon launching, your camera studio will activate in the broadcast desk!
                    </div>
                  )}
                </div>
              </div>

              {/* Match Scoreboard / Live Telemetry Config */}
              <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-md border border-gray-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2 font-serif font-bold">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span>Live Telemetry & Scoreboard Config</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {enableMatchScore && (
                      <button
                        type="button"
                        onClick={() => setShowVSTeams(!showVSTeams)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 font-mono ${showVSTeams ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'}`}
                      >
                        <span>⚔️ VS Team Mode: {showVSTeams ? 'ON' : 'OFF (News/Politics)'}</span>
                      </button>
                    )}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableMatchScore}
                        onChange={(e) => setEnableMatchScore(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>

                {enableMatchScore && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      {showVSTeams ? (
                        <>
                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Team 1 Name</label>
                            <input
                              type="text"
                              placeholder="Real Madrid / India"
                              value={team1Name}
                              onChange={(e) => setTeam1Name(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 rounded-xl text-sm text-white border border-gray-700 focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Team 2 Name</label>
                            <input
                              type="text"
                              placeholder="Barcelona / Australia"
                              value={team2Name}
                              onChange={(e) => setTeam2Name(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 rounded-xl text-sm text-white border border-gray-700 focus:border-red-500"
                            />
                          </div>
                        </>
                      ) : null}
                      <div className={showVSTeams ? "col-span-1" : "sm:col-span-3"}>
                        <label className="block text-[11px] text-gray-400 mb-1">Live Status / Badge Text (e.g. LIVE DEBATE, 78 MINS, BULLISH)</label>
                        <input
                          type="text"
                          placeholder="Kickoff at 7 PM / Lok Sabha Live"
                          value={matchInfo}
                          onChange={(e) => setMatchInfo(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 rounded-xl text-sm text-white border border-gray-700 focus:border-red-500 font-mono"
                        />
                      </div>
                    </div>
                    
                    {/* Custom Sport / Telemetry Fields for Create Form */}
                    <div className="pt-4 border-t border-gray-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-amber-400 uppercase font-mono tracking-wider">
                          📊 Custom Telemetry Fields ({customStats.length})
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => applySportPreset('cricket', false)}
                            className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-gray-950 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all font-mono"
                          >
                            🏏 Cricket
                          </button>
                          <button
                            type="button"
                            onClick={() => applySportPreset('football', false)}
                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-gray-950 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-all font-mono"
                          >
                            ⚽ Football
                          </button>
                          <button
                            type="button"
                            onClick={() => applySportPreset('politics', false)}
                            className="bg-purple-500/10 hover:bg-purple-500 text-purple-300 hover:text-gray-950 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-purple-500/30 transition-all font-mono"
                          >
                            🏛️ Politics
                          </button>
                          <button
                            type="button"
                            onClick={() => applySportPreset('economy', false)}
                            className="bg-blue-500/10 hover:bg-blue-500 text-blue-300 hover:text-gray-950 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-blue-500/30 transition-all font-mono"
                          >
                            📈 Business
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCustomStat(false)}
                            className="bg-gray-800 hover:bg-red-600 text-white font-bold text-[10px] px-3 py-1 rounded-lg border border-gray-700 transition-all flex items-center gap-1 font-mono"
                          >
                            <Plus className="w-3 h-3" /> Add Custom Field
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {customStats.map((stat, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-gray-950/90 p-2 rounded-xl border border-gray-800">
                            <input
                              type="text"
                              placeholder="Label (e.g. Overs, Run Rate, Batsman)"
                              value={stat.label || ''}
                              onChange={(e) => handleCustomStatChange(idx, 'label', e.target.value, false)}
                              className="w-1/3 sm:w-2/5 px-2.5 py-1.5 bg-gray-900 rounded-lg text-xs text-amber-300 font-bold border border-gray-800 focus:outline-none focus:border-amber-500"
                            />
                            <input
                              type="text"
                              placeholder="Value (e.g. 42.3 ov, Kohli 84* (68))"
                              value={stat.value || ''}
                              onChange={(e) => handleCustomStatChange(idx, 'value', e.target.value, false)}
                              className="flex-1 px-2.5 py-1.5 bg-gray-900 rounded-lg text-xs text-white font-mono border border-gray-800 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomStat(idx, false)}
                              className="p-1.5 bg-gray-900 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg transition-colors shrink-0"
                              title="Remove stat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Interactive Poll Config */}
              <div className="bg-gradient-to-br from-red-50 to-rose-50/50 border border-red-100 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-serif font-bold text-red-950">
                    <BarChart2 className="w-5 h-5 text-red-600" />
                    Interactive Reader Poll
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePoll}
                      onChange={(e) => setEnablePoll(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
                {enablePoll && (
                  <div className="space-y-3 pt-2">
                    <input
                      type="text"
                      placeholder="Poll Question (e.g. Who will win El Clásico?)"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-red-200 font-semibold"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Option 1 (e.g. Real Madrid)"
                        value={pollOpt1}
                        onChange={(e) => setPollOpt1(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-red-200"
                      />
                      <input
                        type="text"
                        placeholder="Option 2 (e.g. Barcelona)"
                        value={pollOpt2}
                        onChange={(e) => setPollOpt2(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-red-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-6 py-3 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm px-8 py-3 rounded-xl shadow-lg shadow-red-600/25 hover:shadow-red-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <Radio className="w-4 h-4 animate-pulse" /> Launch Live Blog
                </button>
              </div>
            </form>
          </div>
        ) : selectedBlog ? (
          /* BROADCAST DESK FOR SELECTED EVENT */
          <div className="space-y-8">
            {/* Header info bar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
                <button
                  onClick={() => { setActiveTab('list'); setSelectedBlog(null); }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center sm:justify-start gap-2 shadow-xs shrink-0"
                  title="Return to master event list"
                >
                  <ArrowLeft className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Back to All Events</span>
                </button>
                <div>
                  <div className="flex items-center flex-wrap gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black font-mono shadow-2xs ${selectedBlog.isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-gray-200'}`}>
                      ● {selectedBlog.isLive ? 'LIVE BROADCASTING' : 'EVENT ARCHIVED'}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase text-red-600 bg-red-50 dark:bg-red-950/50 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-900 shadow-2xs">
                      {selectedBlog.category}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-gray-900 dark:text-white leading-snug">{selectedBlog.title}</h2>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Auto-updates synchronize with readers every 5 seconds</p>
                </div>
              </div>

              {/* Desktop Action Buttons */}
              <div className="hidden sm:flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                <button
                  onClick={() => {
                    setEditTitle(selectedBlog.title || '');
                    setEditCategory(selectedBlog.category || 'Sports');
                    setEditTags(Array.isArray(selectedBlog.tags) ? selectedBlog.tags.join(', ') : (selectedBlog.tags || ''));
                    setEditDescription(selectedBlog.description || '');
                    setEditMainImageUrl(selectedBlog.mainImageUrl || '');
                    setIsEditingDetails(!isEditingDetails);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs border shadow-sm transition-all flex items-center gap-1.5 ${
                    isEditingDetails ? 'bg-gray-900 text-white border-gray-800 shadow-md' : 'bg-white text-gray-800 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-red-600" />
                  <span>{isEditingDetails ? 'Cancel Editing' : 'Edit Initial Details'}</span>
                </button>
                <button
                  onClick={handleToggleEventStatus}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs border shadow-sm transition-all ${
                    selectedBlog.isLive ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' : 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                  }`}
                >
                  {selectedBlog.isLive ? '⬛ End Broadcast & Archive' : '🔴 Reopen as Live'}
                </button>
                <Link
                  to="/live-blogs"
                  className="bg-gray-900 text-white px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-gray-800 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5 text-red-500" /> Preview Reader View
                </Link>
              </div>
            </div>

            {/* Mobile Studio Field Switcher (sm:hidden) */}
            <div className="sm:hidden grid grid-cols-4 gap-1 p-1.5 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner">
              <button
                type="button"
                onClick={() => setMobileDeskTab('update')}
                className={`flex flex-col items-center justify-center py-2.5 px-0.5 rounded-xl font-extrabold text-[10px] font-mono uppercase tracking-tight transition-all overflow-hidden ${
                  mobileDeskTab === 'update' ? 'bg-red-600 text-white shadow-md shadow-red-600/20 scale-[1.02]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Send className="w-4 h-4 mb-1 shrink-0" />
                <span className="truncate w-full text-center font-black">⚡ Update</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileDeskTab('stream')}
                className={`flex flex-col items-center justify-center py-2.5 px-0.5 rounded-xl font-extrabold text-[10px] font-mono uppercase tracking-tight transition-all overflow-hidden ${
                  mobileDeskTab === 'stream' ? 'bg-red-600 text-white shadow-md shadow-red-600/20 scale-[1.02]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Radio className="w-4 h-4 mb-1 shrink-0 animate-pulse text-rose-300" />
                <span className="truncate w-full text-center font-black">🎥 Camera</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileDeskTab('score')}
                className={`flex flex-col items-center justify-center py-2.5 px-0.5 rounded-xl font-extrabold text-[10px] font-mono uppercase tracking-tight transition-all overflow-hidden ${
                  mobileDeskTab === 'score' ? 'bg-red-600 text-white shadow-md shadow-red-600/20 scale-[1.02]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Trophy className="w-4 h-4 mb-1 shrink-0 text-amber-400" />
                <span className="truncate w-full text-center font-black">🏆 Scores</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileDeskTab('config');
                  if (!isEditingDetails && !editTitle) {
                    setEditTitle(selectedBlog.title || '');
                    setEditCategory(selectedBlog.category || 'Sports');
                    setEditTags(Array.isArray(selectedBlog.tags) ? selectedBlog.tags.join(', ') : (selectedBlog.tags || ''));
                    setEditDescription(selectedBlog.description || '');
                    setEditMainImageUrl(selectedBlog.mainImageUrl || '');
                  }
                }}
                className={`flex flex-col items-center justify-center py-2.5 px-0.5 rounded-xl font-extrabold text-[10px] font-mono uppercase tracking-tight transition-all overflow-hidden ${
                  mobileDeskTab === 'config' ? 'bg-red-600 text-white shadow-md shadow-red-600/20 scale-[1.02]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Settings className="w-4 h-4 mb-1 shrink-0" />
                <span className="truncate w-full text-center font-black">⚙️ Config</span>
              </button>
            </div>

            {/* Mobile-only Config Controls Card */}
            <div className={`sm:hidden ${mobileDeskTab === 'config' ? 'block' : 'hidden'}`}>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3.5 mb-2">
                <h3 className="font-extrabold text-xs uppercase tracking-wider font-mono text-gray-500 dark:text-gray-400 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2.5">
                  <Settings className="w-4 h-4 text-red-600" /> Broadcast Status & Controls
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={handleToggleEventStatus}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs border shadow-sm transition-all flex items-center justify-center gap-2 ${
                      selectedBlog.isLive ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-green-600 text-white border-green-600'
                    }`}
                  >
                    {selectedBlog.isLive ? '⬛ End Broadcast & Archive Event' : '🔴 Reopen & Resume Live Broadcast'}
                  </button>
                  <Link
                    to="/live-blogs"
                    className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-slate-950 text-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Eye className="w-4 h-4 text-red-500 shrink-0" /> Preview Reader Live Feed →
                  </Link>
                </div>
                <p className="text-[11px] text-muted-foreground text-center pt-1 font-sans">
                  Edit initial title, story overview, and cover photo below.
                </p>
              </div>
            </div>

            {/* EDIT INITIAL EVENT DETAILS PANEL (TOGGLEABLE ON DESKTOP, OR WHEN CONFIG TAB IS ACTIVE ON MOBILE) */}
            {(isEditingDetails || mobileDeskTab === 'config') && (
              <form onSubmit={handleSaveEditedDetails} className={`bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white rounded-3xl p-6 sm:p-8 border border-gray-800 shadow-2xl space-y-6 animate-fadeIn ${mobileDeskTab !== 'config' ? 'hidden sm:block' : 'block'}`}>
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div className="flex items-center gap-2 font-serif text-lg font-bold text-white">
                    <Edit3 className="w-5 h-5 text-red-500" /> Modify Initial Event Metadata
                  </div>
                  <span className="text-xs font-mono bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30">
                    Changes broadcast to readers instantly upon saving
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Event Headline / Title *</label>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-red-500 font-bold text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description / Story Overview *</label>
                      <textarea
                        required
                        rows="4"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 text-gray-200 border border-gray-700 focus:border-red-500 text-sm leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Topic Category *</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-red-500 text-sm font-bold"
                      >
                        <option value="Sports">Sports</option>
                        <option value="Football">Football</option>
                        <option value="Cricket">Cricket</option>
                        <option value="Politics">Politics</option>
                        <option value="Breaking">Breaking</option>
                        <option value="Technology">Technology</option>
                        <option value="Entertainment">Entertainment</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tags (comma separated)</label>
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="e.g. sports, live"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-red-500 text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Cover Photo (URL or Cloudinary Upload)</label>
                      <div className="space-y-2">
                        <input
                          type="url"
                          placeholder="https://..."
                          value={editMainImageUrl}
                          onChange={(e) => setEditMainImageUrl(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-gray-800 text-white border border-gray-700 text-xs"
                        />
                        <label className={`cursor-pointer w-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs ${uploadingEditCover ? 'opacity-50 pointer-events-none' : ''}`}>
                          {uploadingEditCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>{uploadingEditCover ? 'Uploading to Cloudinary...' : 'Upload New Cover Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditCoverUpload}
                            className="hidden"
                            disabled={uploadingEditCover}
                          />
                        </label>
                      </div>
                      {editMainImageUrl && (
                        <div className="mt-3 relative h-24 w-full rounded-xl overflow-hidden border border-gray-700 bg-black/40">
                          <img src={editMainImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setEditMainImageUrl('')}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/80 hover:bg-red-600 text-white rounded-full transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(false)}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-xs px-8 py-3 rounded-xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all flex items-center gap-2 uppercase tracking-wide font-mono"
                  >
                    <CheckCircle className="w-4 h-4" /> Save Details & Sync Feed
                  </button>
                </div>
              </form>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* LEFT TWO COLUMNS: BROADCAST CONTROLS & TIMELINE */}
              <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                {/* Live Video Streaming Desk Controls */}
                <div className={`bg-gradient-to-br from-gray-900 via-slate-950 to-gray-900 text-white rounded-3xl p-5 sm:p-6 border border-gray-800 shadow-xl space-y-5 ${mobileDeskTab === 'stream' ? 'block' : 'hidden sm:block'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-800">
                    <div className="flex items-center gap-2.5 font-serif font-bold text-lg">
                      <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                      <span>Free & Scalable Live Video Streaming</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${deskIsStreamActive && deskStreamType !== 'none' && deskStreamUrl ? 'bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
                        {deskIsStreamActive && deskStreamType !== 'none' && deskStreamUrl ? '● LIVE VIDEO ON' : '○ VIDEO PAUSED'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeskIsStreamActive(!deskIsStreamActive)}
                        className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-sm border ${deskIsStreamActive ? 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900' : 'bg-green-600 text-white border-green-600 hover:bg-green-500'}`}
                      >
                        {deskIsStreamActive ? 'Pause Video Display' : 'Activate Live Display'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Select Live Video Feed Type</span>
                        <span className="text-[10px] text-amber-400 font-normal normal-case">
                          💡 You can post text updates below without stopping your live camera!
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => { 
                            if (deskStreamType !== 'none' && !window.confirm("⚠️ This will remove and shut off the live video stream for all readers! Do you want to disable live video? (To post text updates while streaming, click Cancel and use the timeline form below!)")) {
                              return;
                            }
                            setDeskStreamType('none'); 
                            setDeskIsStreamActive(false); 
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all ${deskStreamType === 'none' ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-md' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}
                        >
                          <div className="font-bold text-xs mb-0.5 flex items-center gap-1.5 text-amber-400">
                            <span>🚫 No Video Stream</span>
                          </div>
                          <p className="text-[10px] text-gray-400">Turn off live video player for readers</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setDeskStreamType('youtube'); setDeskIsStreamActive(true); }}
                          className={`p-3 rounded-2xl border text-left transition-all ${deskStreamType === 'youtube' ? 'bg-red-950/80 border-red-500 text-white shadow-md' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}
                        >
                          <div className="font-bold text-xs text-red-400 mb-0.5">📺 YouTube Live (10+ Lakh Scale)</div>
                          <p className="text-[10px] text-gray-400">100% Free CDN. Infinite concurrency</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!deskStreamUrl || deskStreamType !== 'webrtc') handleGenerateWebRtcRoom(true);
                            else setDeskStreamType('webrtc');
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all ${deskStreamType === 'webrtc' ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}
                        >
                          <div className="font-bold text-xs text-emerald-400 mb-0.5">🎙️ Instant WebRTC Webcam</div>
                          <p className="text-[10px] text-gray-400">Direct camera from laptop/phone</p>
                        </button>
                      </div>
                    </div>

                    {deskStreamType === 'youtube' && (
                      <div className="space-y-3 bg-gray-900/90 p-5 rounded-3xl border border-red-500/30 shadow-inner">
                        <label className="block text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <span>📺 Paste YouTube Live Broadcast Link or Video ID</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., https://www.youtube.com/live/jfKfPfyJRdk or jfKfPfyJRdk"
                          value={deskStreamUrl}
                          onChange={(e) => setDeskStreamUrl(e.target.value)}
                          className="w-full px-4 py-3 bg-black rounded-xl text-white font-mono text-xs border border-gray-700 focus:border-red-500 focus:outline-none shadow-sm"
                        />
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          🔥 Pro-Tip: Go live on YouTube (Unlisted or Public) from your phone or streaming software, and paste the live broadcast link here (supports `youtube.com/live/ID` or watch URLs). News Nests natively displays an interactive widescreen player to <strong>lakhs of concurrent viewers</strong> with zero server bandwidth load!
                        </p>
                        {deskStreamUrl && (
                          <div className="mt-4 pt-4 border-t border-gray-800 space-y-2.5">
                            <div className="flex items-center justify-between text-xs text-gray-300">
                              <span className="font-bold text-red-400 flex items-center gap-2 uppercase tracking-wide">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                                YouTube Live Studio Monitor Preview
                              </span>
                              <span className="bg-red-950 text-red-300 font-mono text-[10px] font-black px-2.5 py-1 rounded-lg border border-red-800">
                                🟢 STREAM EMBED READY
                              </span>
                            </div>
                            <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black aspect-video shadow-2xl">
                              <MemoizedYouTubePreview streamUrl={deskStreamUrl} />
                            </div>
                            <p className="text-[11px] text-emerald-400 font-medium text-center">
                              ✓ Verified! Click the blue <strong>"Save / Broadcast Desk Settings"</strong> button below to push this live stream to all readers!
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {deskStreamType === 'webrtc' && (
                      <div className="space-y-3.5 bg-[#080b10] p-5 rounded-3xl border border-emerald-500/40 shadow-inner">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
                          <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${deskIsStreamActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                            WebRTC Low-Latency Studio Monitor {deskIsStreamActive ? '(LIVE)' : '(PAUSED)'}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {deskStreamUrl && (
                              <button
                                type="button"
                                onClick={handleToggleStreamPause}
                                disabled={updatingStream}
                                className={`px-4 py-1.5 rounded-xl font-black text-xs shadow-md uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                  deskIsStreamActive 
                                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20' 
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
                                }`}
                              >
                                {updatingStream ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                {deskIsStreamActive ? '⏸️ Pause Live Stream' : '▶️ Resume Live Stream'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleGenerateWebRtcRoom(true)}
                              className="text-xs bg-gray-900 hover:bg-gray-800 text-emerald-300 px-3.5 py-1.5 rounded-xl font-mono font-bold border border-emerald-700/50 transition-all"
                            >
                              🔄 New Room
                            </button>
                          </div>
                        </div>
                        {deskStreamUrl && (
                          <>
                            <div className="text-xs font-mono bg-black/80 p-2.5 rounded-xl text-gray-300 flex items-center justify-between border border-gray-800">
                              <span>Room Key: <strong className="text-emerald-400 font-bold">{deskStreamUrl}</strong></span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${deskIsStreamActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                                {deskIsStreamActive ? '● STREAM BROADCASTING TO READERS' : '⏸️ STREAM PAUSED FOR READERS'}
                              </span>
                            </div>
                            <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black">
                              <MemoizedWebRTCRoom streamUrl={deskStreamUrl} />
                              {!deskIsStreamActive && (
                                <div className="absolute top-3 left-3 right-3 bg-amber-500/90 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-between backdrop-blur-sm z-20 shadow-lg animate-bounce">
                                  <span className="flex items-center gap-2">
                                    <span className="text-base">⏸️</span>
                                    <span><strong>STREAM IS CURRENTLY PAUSED:</strong> Readers are viewing the standby screen. Your camera preview is private to this desk.</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleToggleStreamPause}
                                    className="bg-slate-950 hover:bg-black text-amber-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Resume Now
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="bg-[#0c141e] p-4 rounded-2xl border border-cyan-500/40 space-y-2 text-left shadow-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold font-mono text-cyan-400 uppercase flex items-center gap-1.5">
                                  <span>📱 STREAM DIRECT FROM MOBILE PHONE CAMERA</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`https://vdo.ninja/?push=${deskStreamUrl}&webcam&autostart=1&quality=1`);
                                    showToast('📱 Mobile Camera Broadcast Link Copied!\n\nOpen or send this link to your mobile phone (Chrome/Safari). Because it runs natively on secure HTTPS, your phone camera will start broadcasting immediately without local WiFi HTTP security restrictions!', 'success');
                                  }}
                                  className="text-[11px] bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-extrabold px-3 py-1.5 rounded-xl transition-all border border-cyan-500/50"
                                >
                                  📋 Copy Mobile Camera Link
                                </button>
                              </div>
                              <p className="text-[11px] text-gray-300 leading-relaxed font-normal">
                                <strong>Why doesn't webcam turn on when accessing local WiFi HTTP (`http://192.168.x.x`) on phone?</strong> iOS Safari and Android Chrome strictly block camera permissions on non-HTTPS local IPs! To broadcast from your phone camera on local WiFi or 4G/5G, copy and open this direct secure HTTPS link on your phone:
                              </p>
                              <div className="p-2.5 bg-black/80 rounded-xl border border-gray-800 text-[10px] font-mono text-cyan-400 break-all select-all font-bold">
                                https://vdo.ninja/?push={deskStreamUrl}&webcam&autostart=1&quality=1
                              </div>
                            </div>
                            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                              💡 Use the <strong>"⏸️ Pause Live Stream"</strong> button above if you need to mute your camera or take a break without breaking the reader room!
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {deskStreamType !== 'none' && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleUpdateStreamConfig}
                          disabled={updatingStream}
                          className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
                        >
                          {updatingStream ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          <span>Sync & Broadcast Live Feed to Readers</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* UPDATE TAB CONTAINER (Instant Form + Timeline History) */}
                <div className={`space-y-6 sm:space-y-8 ${mobileDeskTab === 'update' ? 'block' : 'hidden sm:block'}`}>
                {/* Instant Timeline Update Form */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-base font-bold text-gray-900 font-serif flex items-center gap-2">
                      <Send className="w-4 h-4 text-red-600" /> Post Real-Time Timeline Text Update
                    </h3>
                    <span className="text-[11px] bg-green-50 text-green-700 font-bold px-2.5 py-0.5 rounded-full border border-green-200 animate-pulse">
                      ● Ready to Broadcast
                    </span>
                  </div>

                  {deskIsStreamActive && deskStreamType !== 'none' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span><strong>🎥 {deskStreamType === 'webrtc' ? 'WebRTC Webcam' : 'YouTube Live'} is LIVE:</strong> Posting text updates below will run in parallel and will <strong>NOT</strong> interrupt or pause your video broadcast!</span>
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleBroadcastUpdate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Update Badge / Headline (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. GOAL! / WICKET! / MATCH UPDATE / YELLOW CARD"
                        value={updateTitle}
                        onChange={(e) => setUpdateTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Update Story / Commentary *</label>
                      <textarea
                        required
                        rows="3"
                        placeholder="Type what just happened... (Appears in real-time within 5s for readers)"
                        value={updateContent}
                        onChange={(e) => setUpdateContent(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Attach Media (URL or Cloudinary Upload)</label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="url"
                          placeholder="https://... (Or upload image file)"
                          value={updateImageUrl}
                          onChange={(e) => setUpdateImageUrl(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        />
                        <label className={`cursor-pointer bg-gray-900 hover:bg-gray-800 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-2xs ${uploadingUpdateImg ? 'opacity-50 pointer-events-none' : ''}`}>
                          {uploadingUpdateImg ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" /> : <Upload className="w-3.5 h-3.5 text-red-400" />}
                          <span>{uploadingUpdateImg ? 'Uploading...' : 'Upload Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleUpdateImageUpload}
                            className="hidden"
                            disabled={uploadingUpdateImg}
                          />
                        </label>
                      </div>
                      {updateImageUrl && (
                        <div className="mt-2.5 relative inline-block rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 max-h-36">
                          <img src={updateImageUrl} alt="Attachment preview" className="h-28 w-auto object-cover block" />
                          <button
                            type="button"
                            onClick={() => setUpdateImageUrl('')}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition-all"
                            title="Remove attachment"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={broadcasting || !selectedBlog.isLive}
                        className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm px-8 py-3 rounded-2xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4 animate-pulse" />}
                        Broadcast Update Now
                      </button>
                    </div>
                  </form>
                </div>

                {/* Broadcast History / Timeline List */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 font-serif mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Clock className="w-4 h-4 text-gray-500" /> Broadcasted Updates ({selectedBlog.updates?.length || 0})
                  </h3>

                  {!selectedBlog.updates || selectedBlog.updates.length === 0 ? (
                    <p className="text-center py-8 text-gray-400 text-xs font-medium">No timeline updates posted yet. Use the form above to post your first live bulletin!</p>
                  ) : (
                    <div className="space-y-6">
                      {[...selectedBlog.updates].reverse().map((upd, i) => (
                        <div key={upd._id || i} className="border-l-2 border-red-500 pl-4 py-1 relative">
                          <span className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-sm"></span>
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1 font-mono">
                            <span>{new Date(upd.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {upd.title && (
                              <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-[10px] uppercase">
                                {upd.title}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed mt-1">{upd.content}</p>
                          {upd.imageUrl && (
                            <img src={upd.imageUrl} alt="Attachment" className="mt-3 rounded-xl max-h-48 object-cover border border-gray-200 shadow-sm" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE SCOREBOARD EDITOR & POLL STATUS */}
              <div className={`space-y-6 ${mobileDeskTab === 'score' ? 'block' : 'hidden sm:block'}`}>
                {/* Scoreboard / Telemetry Editor Card */}
                <div className="bg-gray-900 text-white rounded-3xl p-6 shadow-xl border border-gray-800 space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <h3 className="font-serif font-bold text-sm flex items-center gap-2 text-yellow-500">
                      <Trophy className="w-4 h-4" /> Live Telemetry Controller
                    </h3>
                    <button
                      type="button"
                      onClick={() => setDeskShowVSTeams(!deskShowVSTeams)}
                      className={`text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-lg border uppercase tracking-wider transition-all ${deskShowVSTeams ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'}`}
                    >
                      ⚔️ VS Teams: {deskShowVSTeams ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {deskShowVSTeams ? (
                      <>
                        <div className="bg-gray-800/80 p-3 rounded-2xl flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={deskTeam1Name}
                            onChange={(e) => setDeskTeam1Name(e.target.value)}
                            placeholder="Team 1 Name"
                            className="w-1/2 sm:w-3/5 px-2.5 py-1.5 bg-gray-900 font-bold text-xs sm:text-sm text-white rounded-xl border border-gray-700 focus:outline-none focus:border-red-500"
                          />
                          <input
                            type="text"
                            value={deskTeam1Score}
                            onChange={(e) => setDeskTeam1Score(e.target.value)}
                            placeholder="Score (2)"
                            className="w-20 px-3 py-1.5 bg-gray-900 text-center font-bold text-yellow-400 text-lg rounded-xl border border-gray-700 focus:outline-none focus:border-red-500 font-mono"
                          />
                        </div>
                        <div className="text-center font-bold text-xs text-gray-500 uppercase font-mono">VS</div>
                        <div className="bg-gray-800/80 p-3 rounded-2xl flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={deskTeam2Name}
                            onChange={(e) => setDeskTeam2Name(e.target.value)}
                            placeholder="Team 2 Name"
                            className="w-1/2 sm:w-3/5 px-2.5 py-1.5 bg-gray-900 font-bold text-xs sm:text-sm text-white rounded-xl border border-gray-700 focus:outline-none focus:border-red-500"
                          />
                          <input
                            type="text"
                            value={deskTeam2Score}
                            onChange={(e) => setDeskTeam2Score(e.target.value)}
                            placeholder="Score (1)"
                            className="w-20 px-3 py-1.5 bg-gray-900 text-center font-bold text-yellow-400 text-lg rounded-xl border border-gray-700 focus:outline-none focus:border-red-500 font-mono"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-gray-400 text-center flex items-center justify-center gap-2">
                        <span>ℹ️ VS Teams hidden for News/Political stream. Using Custom Telemetry below.</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Status / Badge Text (e.g. LIVE DEBATE, 78 MINS, BULLISH)</label>
                      <input
                        type="text"
                        value={deskMatchInfo}
                        onChange={(e) => setDeskMatchInfo(e.target.value)}
                        placeholder="e.g. Lok Sabha Session / 78 mins / Over 42.1"
                        className="w-full px-3 py-2 bg-gray-800 rounded-xl text-xs text-gray-200 border border-gray-700 font-mono font-bold"
                      />
                    </div>

                    {/* Custom Sport Telemetry Editor in Broadcast Desk */}
                    <div className="pt-3 border-t border-gray-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-amber-400 uppercase font-mono tracking-wider">
                          📊 Custom Stats ({deskCustomStats.length})
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => applySportPreset('cricket', true)}
                            className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-gray-950 font-bold text-[9px] px-2 py-1 rounded-md border border-amber-500/30 transition-all font-mono"
                          >
                            🏏 Cricket
                          </button>
                          <button
                            type="button"
                            onClick={() => applySportPreset('football', true)}
                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-gray-950 font-bold text-[9px] px-2 py-1 rounded-md border border-emerald-500/30 transition-all font-mono"
                          >
                            ⚽ Football
                          </button>
                          <button
                            type="button"
                            onClick={() => applySportPreset('politics', true)}
                            className="bg-purple-500/10 hover:bg-purple-500 text-purple-300 hover:text-gray-950 font-bold text-[9px] px-2 py-1 rounded-md border border-purple-500/30 transition-all font-mono"
                          >
                            🏛️ Politics
                          </button>
                          <button
                            type="button"
                            onClick={() => applySportPreset('economy', true)}
                            className="bg-blue-500/10 hover:bg-blue-500 text-blue-300 hover:text-gray-950 font-bold text-[9px] px-2 py-1 rounded-md border border-blue-500/30 transition-all font-mono"
                          >
                            📈 Business
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCustomStat(true)}
                            className="bg-gray-800 hover:bg-red-600 text-white font-bold text-[9px] px-2 py-1 rounded-md border border-gray-700 transition-all font-mono flex items-center gap-1"
                          >
                            <Plus className="w-2.5 h-2.5" /> Add Row
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {deskCustomStats.map((stat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-gray-950 p-1.5 rounded-xl border border-gray-800">
                            <input
                              type="text"
                              placeholder="Label (Overs, CRR...)"
                              value={stat.label || ''}
                              onChange={(e) => handleCustomStatChange(idx, 'label', e.target.value, true)}
                              className="w-1/3 px-2 py-1 bg-gray-900 rounded-lg text-[11px] text-amber-300 font-bold border border-gray-800 focus:outline-none focus:border-amber-500"
                            />
                            <input
                              type="text"
                              placeholder="Value (42.3 ov...)"
                              value={stat.value || ''}
                              onChange={(e) => handleCustomStatChange(idx, 'value', e.target.value, true)}
                              className="flex-1 px-2 py-1 bg-gray-900 rounded-lg text-[11px] text-white font-mono border border-gray-800 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomStat(idx, true)}
                              className="p-1 bg-gray-900 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg transition-colors shrink-0"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleUpdateScoreboard}
                      disabled={updatingScore}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 font-bold text-xs text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      {updatingScore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Update Live Score & Telemetry
                    </button>
                  </div>
                </div>

                {/* Poll Results Tracker */}
                {selectedBlog.poll && selectedBlog.poll.question && (
                  <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h3 className="font-serif font-bold text-sm text-gray-900 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-red-600" /> Live Poll Results
                      </h3>
                      <span className="text-[11px] font-bold text-gray-500">
                        {selectedBlog.poll.options?.reduce((acc, curr) => acc + (curr.votes || 0), 0)} Total Votes
                      </span>
                    </div>

                    <p className="font-bold text-sm text-gray-800">{selectedBlog.poll.question}</p>

                    <div className="space-y-3 pt-1">
                      {selectedBlog.poll.options?.map((opt, idx) => {
                        const total = selectedBlog.poll.options.reduce((acc, curr) => acc + (curr.votes || 0), 0) || 1;
                        const pct = Math.round(((opt.votes || 0) / total) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-gray-700">
                              <span>{opt.text}</span>
                              <span>{opt.votes || 0} votes ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <div className="bg-red-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
