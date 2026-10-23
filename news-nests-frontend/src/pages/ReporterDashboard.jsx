import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  FileEdit, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Image as ImageIcon, 
  Video, 
  Eye, 
  Award, 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  AlertCircle,
  BarChart3,
  Layers,
  Film,
  Send,
  UploadCloud,
  Check
} from 'lucide-react';

export default function ReporterDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);

  // Mobile navigation tab between Creator Desk and Content Log
  const [mobileView, setMobileView] = useState('creator'); // 'creator' or 'timeline'
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'ARTICLE', 'GALLERY', 'VIDEO', 'DRAFT', 'REJECTED'

  // Submission Type Switcher: 'article', 'gallery', or 'video'
  const [submissionType, setSubmissionType] = useState('article');
  const [dbCategories, setDbCategories] = useState([]);
  
  // Article Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('politics');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitAction, setSubmitAction] = useState('submit');

  // Gallery Form State
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryDesc, setGalleryDesc] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('politics');
  const [galleryTags, setGalleryTags] = useState('');
  const [photographerName, setPhotographerName] = useState(''); 
  const [galleryImages, setGalleryImages] = useState(null); 

  // Video News Form State
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoCategory, setVideoCategory] = useState('politics');
  const [videoTags, setVideoTags] = useState('');
  const [videoSourceType, setVideoSourceType] = useState('url'); // 'url' or 'upload'
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState('');
  const [videoThumbnail, setVideoThumbnail] = useState(null);
  const [videoIsShort, setVideoIsShort] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const [newsRes, galleryRes, videoRes, catRes, userRes] = await Promise.all([
        api.get('/news/my-submissions').catch(() => ({ data: [] })),
        api.get('/photo-galleries/my-submissions').catch(() => ({ data: [] })),
        api.get('/videos/my-submissions').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/user/me').catch(() => ({ data: {} }))
      ]);

      setSubmissions(Array.isArray(newsRes.data) ? newsRes.data : []);
      setGalleries(Array.isArray(galleryRes.data) ? galleryRes.data : []);
      setVideos(Array.isArray(videoRes.data) ? videoRes.data : []);
      
      const permissions = userRes.data.permissions || [];
      setCanSubmit(permissions.includes('create_content'));

      const allowedCats = userRes.data.allowedCategories || [];
      const hasAll = allowedCats.includes('ALL');
      
      const defaultCats = [
        { _id: 'politics', name: 'Politics' },
        { _id: 'sports', name: 'Sports' },
        { _id: 'business', name: 'Business' },
        { _id: 'entertainment', name: 'Entertainment' },
        { _id: 'technology', name: 'Technology' },
        { _id: 'health', name: 'Health' },
        { _id: 'education', name: 'Education' },
        { _id: 'lifestyle', name: 'Lifestyle' },
        { _id: 'science', name: 'Science' },
        { _id: 'travel', name: 'Travel' }
      ];

      const merged = [...defaultCats];
      if (Array.isArray(catRes.data) && catRes.data.length > 0) {
        catRes.data.forEach(dbCat => {
          if (!merged.some(c => c.name.toLowerCase() === dbCat.name.toLowerCase())) {
            merged.push(dbCat);
          }
        });
      }
      const finalCats = hasAll ? merged : merged.filter(c => allowedCats.includes(c.name.toLowerCase()));
      setDbCategories(finalCats);
      
      if (finalCats.length > 0) {
        if (!finalCats.some(c => c.name.toLowerCase() === category)) setCategory(finalCats[0].name.toLowerCase());
        if (!finalCats.some(c => c.name.toLowerCase() === galleryCategory)) setGalleryCategory(finalCats[0].name.toLowerCase());
        if (!finalCats.some(c => c.name.toLowerCase() === videoCategory)) setVideoCategory(finalCats[0].name.toLowerCase());
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Merge all submitted content and compute metrics
  const combinedContent = useMemo(() => {
    const list = [
      ...submissions.map(s => ({ ...s, contentType: 'ARTICLE' })),
      ...galleries.map(g => ({ ...g, contentType: 'GALLERY' })),
      ...videos.map(v => ({ ...v, contentType: 'VIDEO' }))
    ];
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [submissions, galleries, videos]);

  const filteredContent = useMemo(() => {
    if (filterType === 'ALL') return combinedContent;
    if (filterType === 'ARTICLE') return combinedContent.filter(c => c.contentType === 'ARTICLE');
    if (filterType === 'GALLERY') return combinedContent.filter(c => c.contentType === 'GALLERY');
    if (filterType === 'VIDEO') return combinedContent.filter(c => c.contentType === 'VIDEO');
    if (filterType === 'DRAFT') return combinedContent.filter(c => c.status === 'draft');
    if (filterType === 'REJECTED') return combinedContent.filter(c => c.status === 'rejected');
    return combinedContent;
  }, [combinedContent, filterType]);

  const stats = useMemo(() => {
    const totalViews = combinedContent.reduce((acc, item) => acc + (Number(item.views) || 0), 0);
    const approvedCount = combinedContent.filter(item => item.status === 'approved' || item.contentType === 'VIDEO').length;
    const pendingCount = combinedContent.filter(item => item.status === 'pending').length;
    return {
      articles: submissions.length,
      galleries: galleries.length,
      videos: videos.length,
      totalViews,
      approvedCount,
      pendingCount
    };
  }, [combinedContent, submissions, galleries, videos]);

  const handleArticleImagesChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setImages(prev => {
        const prevArray = prev ? Array.from(prev) : [];
        const newArray = Array.from(e.target.files);
        return [...prevArray, ...newArray];
      });
    }
  };

  const removeArticleImage = (indexToRemove) => {
    setImages(prev => {
      if (!prev) return null;
      const arr = Array.from(prev);
      const newArr = arr.filter((_, idx) => idx !== indexToRemove);
      return newArr.length > 0 ? newArr : null;
    });
  };

  const handleGalleryImagesChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setGalleryImages(prev => {
        const prevArray = prev ? Array.from(prev) : [];
        const newArray = Array.from(e.target.files);
        return [...prevArray, ...newArray];
      });
    }
  };

  const removeGalleryImage = (indexToRemove) => {
    setGalleryImages(prev => {
      if (!prev) return null;
      const arr = Array.from(prev);
      const newArr = arr.filter((_, idx) => idx !== indexToRemove);
      return newArr.length > 0 ? newArr : null;
    });
  };

  const handleArticleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', category);
      formData.append('tags', tags);
      formData.append('author', user?.fullName || 'Reporter Desk');
      formData.append('action', submitAction);
      
      if (scheduledAt) formData.append('scheduledAt', scheduledAt);
      if (images) {
        for (let i = 0; i < images.length; i++) {
          formData.append('images', images[i]);
        }
      }

      if (editingId) {
        await api.put(`/news/draft/${editingId}`, formData);
      } else {
        await api.post('/news', formData);
      }

      setMessage(`🎉 Article ${submitAction === 'draft' ? 'saved as draft' : 'submitted successfully with priority visibility'}!`);
      setTitle('');
      setContent('');
      setTags('');
      setImages(null);
      setScheduledAt('');
      setEditingId(null);
      
      const fileInput = document.getElementById('article-image-upload');
      if (fileInput) fileInput.value = '';
      
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to submit article');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGallerySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('title', galleryTitle);
      formData.append('description', galleryDesc);
      formData.append('category', galleryCategory);
      formData.append('tags', galleryTags);
      formData.append('photographer', photographerName || user?.fullName || 'Staff Photographer');
      
      if (galleryImages) {
        for (let i = 0; i < galleryImages.length; i++) {
          formData.append('images', galleryImages[i]);
        }
      }
      
      await api.post('/photo-galleries', formData);

      setMessage('🎉 Photo Gallery submitted successfully for editorial review!');
      setGalleryTitle('');
      setGalleryDesc('');
      setGalleryTags('');
      setPhotographerName('');
      setGalleryImages(null);
      
      const fileInput = document.getElementById('gallery-images-upload');
      if (fileInput) fileInput.value = '';
      
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to submit gallery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    if (videoSourceType === 'upload' && !videoFile) {
      setMessage('Please select a local video file to upload.');
      return;
    }
    if (videoSourceType === 'url' && !videoUrl) {
      setMessage('Please provide a valid video URL.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('title', videoTitle);
      formData.append('description', videoDesc);
      formData.append('category', videoCategory);
      formData.append('tags', videoTags);
      formData.append('reporter', user?.fullName || 'Broadcast Reporter');
      
      if (videoSourceType === 'url') {
        formData.append('videoUrl', videoUrl);
      } else if (videoFile) {
        formData.append('video', videoFile);
      }
      
      if (videoDuration) formData.append('duration', videoDuration);
      if (videoIsShort) formData.append('isShort', 'true');
      if (videoThumbnail) formData.append('thumbnail', videoThumbnail);

      await api.post('/videos', formData);

      setMessage('🎉 Video News published successfully! Your report is now live on the Video News feed.');
      setVideoTitle('');
      setVideoDesc('');
      setVideoUrl('');
      setVideoFile(null);
      setVideoDuration('');
      setVideoThumbnail(null);
      setVideoIsShort(false);

      const fileInput = document.getElementById('video-thumbnail-upload');
      if (fileInput) fileInput.value = '';
      const vFileInput = document.getElementById('video-file-upload');
      if (vFileInput) vFileInput.value = '';

      fetchSubmissions();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to submit video news');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDraft = (item) => {
    setSubmissionType('article');
    setEditingId(item._id);
    setTitle(item.title);
    setContent(item.content);
    setCategory(item.category);
    if (item.scheduledAt) {
      setScheduledAt(new Date(item.scheduledAt).toISOString().slice(0, 16));
    } else {
      setScheduledAt('');
    }
    setImages(null);
    setMobileView('creator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-sans">
      {/* Executive Welcome Header */}
      <div className="bg-gradient-to-br from-neutral-900 via-stone-900 to-neutral-950 border-b border-border/40 py-8 px-4 sm:px-6 lg:px-8 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-12 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-neutral-900 rounded-[14px] flex items-center justify-center text-2xl font-black text-white uppercase font-mono">
                {user?.fullName ? user.fullName[0] : 'R'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase tracking-wider font-mono">
                  <ShieldCheck className="w-3 h-3 text-rose-400" /> Verified Reporter Suite
                </span>
                <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline-block">| Priority Algorithmic Feed Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-serif">
                {user?.fullName || 'Creator'} Command Hub
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-0.5">
                Manage high-impact editorial stories, breaking video dispatches, and photo galleries.
              </p>
            </div>
          </div>

          {/* Quick Clearances Badge */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-4 py-3 flex flex-col justify-center sm:min-w-[220px]">
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-500 mb-1 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Editorial Clearance
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {dbCategories.length > 8 ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                  ALL CATEGORIES AUTHORIZED
                </span>
              ) : (
                dbCategories.slice(0, 4).map(cat => (
                  <span key={cat._id} className="text-xs font-bold text-zinc-200 bg-neutral-800/80 px-2 py-0.5 rounded capitalize">
                    {cat.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Statistics Widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-border transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-colors" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Published Articles</p>
              <h3 className="text-2xl font-black mt-1 text-foreground font-serif">{stats.articles}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 shrink-0">
              <FileEdit className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-border transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Photo Galleries</p>
              <h3 className="text-2xl font-black mt-1 text-foreground font-serif">{stats.galleries}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-border transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Video Reports</p>
              <h3 className="text-2xl font-black mt-1 text-foreground font-serif">{stats.videos}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
              <Video className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-border transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Total Audience Views</p>
              <h3 className="text-2xl font-black mt-1 text-emerald-600 font-serif">{stats.totalViews.toLocaleString()}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Mobile View Switcher (Visible only on mobile/tablet < 1024px) */}
        <div className="lg:hidden flex border border-border bg-card/60 backdrop-blur-md rounded-2xl p-1 mb-6 shadow-xs">
          <button
            onClick={() => setMobileView('creator')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mobileView === 'creator' ? 'bg-red-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileEdit className="w-4 h-4" /> Creator Desk
          </button>
          <button
            onClick={() => setMobileView('timeline')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mobileView === 'timeline' ? 'bg-red-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4" /> Content Log ({combinedContent.length})
          </button>
        </div>

        {/* Dual Column Layout for Desktop / Tabbed for Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Creator Desk (Col Span 7) */}
          <div className={`lg:col-span-7 ${mobileView === 'creator' ? 'block' : 'hidden lg:block'}`}>
            {canSubmit ? (
              <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                  <div>
                    <h2 className="text-2xl font-black text-foreground font-serif tracking-tight flex items-center gap-2">
                      {editingId ? 'Edit Draft Report' : 'New Dispatch'}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                      Select your reporting format below. Reporter posts are prioritized in Latest News.
                    </p>
                  </div>
                  {editingId && (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 font-bold text-xs" onClick={() => {
                      setEditingId(null);
                      setTitle('');
                      setContent('');
                      setScheduledAt('');
                    }}>
                      Cancel Edit
                    </Button>
                  )}
                </div>

                {/* 3-Way Content Type Switcher */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  <button 
                    type="button"
                    onClick={() => { setSubmissionType('article'); setEditingId(null); setMessage(''); }}
                    className={`py-3.5 px-2 flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200 shadow-2xs group ${
                      submissionType === 'article' 
                        ? 'border-red-600 bg-red-600/10 text-red-600 scale-[1.02]' 
                        : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:border-border'
                    }`}
                  >
                    <FileEdit className={`w-6 h-6 mb-1.5 transition-transform group-hover:scale-110 ${submissionType === 'article' ? 'text-red-600' : 'text-muted-foreground'}`} />
                    <span className="font-bold text-xs sm:text-sm font-sans">News Article</span>
                    <span className="text-[10px] opacity-70 mt-0.5 font-mono hidden sm:inline">Priority Headline</span>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => { setSubmissionType('gallery'); setEditingId(null); setMessage(''); }}
                    className={`py-3.5 px-2 flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200 shadow-2xs group ${
                      submissionType === 'gallery' 
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 scale-[1.02]' 
                        : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:border-border'
                    }`}
                  >
                    <ImageIcon className={`w-6 h-6 mb-1.5 transition-transform group-hover:scale-110 ${submissionType === 'gallery' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                    <span className="font-bold text-xs sm:text-sm font-sans">Photo Gallery</span>
                    <span className="text-[10px] opacity-70 mt-0.5 font-mono hidden sm:inline">Visual Story</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => { setSubmissionType('video'); setEditingId(null); setMessage(''); }}
                    className={`py-3.5 px-2 flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200 shadow-2xs group ${
                      submissionType === 'video' 
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 scale-[1.02]' 
                        : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:border-border'
                    }`}
                  >
                    <Video className={`w-6 h-6 mb-1.5 transition-transform group-hover:scale-110 ${submissionType === 'video' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                    <span className="font-bold text-xs sm:text-sm font-sans">Video News</span>
                    <span className="text-[10px] font-bold uppercase bg-blue-500 text-white px-1.5 py-0.2 rounded mt-0.5 font-mono animate-pulse hidden sm:inline-block">New</span>
                  </button>
                </div>
                
                {message && (
                  <div className={`p-4 mb-6 rounded-2xl text-sm font-bold flex items-center gap-3 border shadow-xs ${
                    message.includes('🎉') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-600'
                  }`}>
                    {message.includes('🎉') ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <span>{message}</span>
                  </div>
                )}

                {/* FORM 1: NEWS ARTICLE */}
                {submissionType === 'article' && (
                  <form onSubmit={handleArticleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                        Headline Title *
                      </label>
                      <Input 
                        required 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder="e.g., Central Bank Announces Historic Policy Shift on Inflation" 
                        className="h-12 rounded-xl text-base font-bold bg-muted/20 border-border/80 focus:border-red-600 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Editorial Category *
                        </label>
                        <select 
                          value={category} 
                          onChange={(e) => setCategory(e.target.value)}
                          className="flex h-12 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm font-bold capitalize shadow-xs focus:ring-2 focus:ring-red-500/50 outline-none transition-colors"
                        >
                          {dbCategories.filter(cat => !cat.contentTypes || cat.contentTypes.includes('article')).map(cat => (
                            <option key={cat._id} value={cat.name.toLowerCase()}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Schedule Publish (Optional)
                        </label>
                        <Input 
                          type="datetime-local" 
                          value={scheduledAt} 
                          onChange={(e) => setScheduledAt(e.target.value)} 
                          className="h-12 rounded-xl text-xs font-semibold bg-muted/20 border-border/80"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                        Tags (comma separated)
                      </label>
                      <Input 
                        value={tags} 
                        onChange={(e) => setTags(e.target.value)} 
                        placeholder="e.g. politics, election, news" 
                        className="h-12 rounded-xl text-sm font-semibold bg-muted/20 border-border/80"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                        Cover Images (Optional)
                      </label>
                      
                      {images && images.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-3">
                          {Array.from(images).map((file, idx) => (
                            <div key={idx} className="relative group">
                              <img src={URL.createObjectURL(file)} alt={`Preview ${idx}`} className="w-24 h-24 object-cover rounded-xl border border-border/50 shadow-sm" />
                              <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); removeArticleImage(idx); }} 
                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30 cursor-pointer hover:scale-110"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="border-2 border-dashed border-border/80 rounded-2xl p-4 bg-muted/10 hover:bg-muted/20 transition-colors text-center cursor-pointer relative mt-2">
                        <Input 
                          id="article-image-upload"
                          type="file" 
                          accept="image/*" 
                          multiple
                          onChange={handleArticleImagesChange} 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="flex flex-col items-center justify-center pointer-events-none py-2 w-full">
                          <UploadCloud className="w-8 h-8 text-muted-foreground mb-1.5" />
                          <p className="text-sm font-bold text-foreground">
                            Tap to add photographs from device
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Supports WEBP, JPG, PNG up to 10MB</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                        Article Body *
                      </label>
                      <textarea 
                        required
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="flex min-h-[260px] w-full rounded-2xl border border-border/80 bg-background p-4 text-sm leading-relaxed font-normal shadow-xs focus:ring-2 focus:ring-red-500/50 focus:border-red-600 outline-none transition-all"
                        placeholder="Write your comprehensive news report here. Break into paragraphs for optimal mobile readability..."
                      ></textarea>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button 
                        type="submit" 
                        variant="outline"
                        className="flex-1 h-13 rounded-xl font-extrabold text-xs tracking-wider uppercase border-border hover:bg-muted font-mono" 
                        onClick={() => setSubmitAction('draft')}
                        disabled={submitting}
                      >
                        Save as Draft
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-2 h-13 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-mono" 
                        onClick={() => setSubmitAction(scheduledAt ? 'schedule' : 'submit')}
                        disabled={submitting}
                      >
                        <Send className="w-4 h-4" />
                        {submitting ? 'PROCESSING...' : (scheduledAt ? 'SCHEDULE PUBLISH' : (editingId ? 'UPDATE ARTICLE' : 'PUBLISH WITH PRIORITY'))}
                      </Button>
                    </div>
                  </form>
                )}

                {/* FORM 2: PHOTO GALLERY */}
                {submissionType === 'gallery' && (
                  <form onSubmit={handleGallerySubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                        Gallery Headline *
                      </label>
                      <Input 
                        required 
                        value={galleryTitle} 
                        onChange={(e) => setGalleryTitle(e.target.value)} 
                        placeholder="e.g., In Pictures: The 2026 Olympic Stadium Opening Ceremony" 
                        className="h-12 rounded-xl text-base font-bold bg-muted/20 border-border/80 focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Category *
                        </label>
                        <select 
                          value={galleryCategory} 
                          onChange={(e) => setGalleryCategory(e.target.value)}
                          className="flex h-12 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm font-bold capitalize shadow-xs focus:ring-2 focus:ring-amber-500/50 outline-none transition-colors"
                        >
                          {dbCategories.filter(cat => !cat.contentTypes || cat.contentTypes.includes('photo_gallery')).map(cat => (
                            <option key={cat._id} value={cat.name.toLowerCase()}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Tags (comma separated)
                        </label>
                        <Input 
                          value={galleryTags} 
                          onChange={(e) => setGalleryTags(e.target.value)} 
                          placeholder="e.g. photos, gallery" 
                          className="h-12 rounded-xl text-sm font-semibold bg-muted/20 border-border/80"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Photographer Credit (Optional)
                        </label>
                        <Input 
                          value={photographerName} 
                          onChange={(e) => setPhotographerName(e.target.value)} 
                          placeholder="e.g., Elena Vance (Associated Press)" 
                          className="h-12 rounded-xl text-xs font-semibold bg-muted/20 border-border/80"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                        Upload High-Res Gallery Photos *
                      </label>
                      
                      {galleryImages && galleryImages.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-3">
                          {Array.from(galleryImages).map((file, idx) => (
                            <div key={idx} className="relative group">
                              <img src={URL.createObjectURL(file)} alt={`Preview ${idx}`} className="w-24 h-24 object-cover rounded-xl border border-border/50 shadow-sm" />
                              <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); removeGalleryImage(idx); }} 
                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30 cursor-pointer hover:scale-110"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="border-2 border-dashed border-border/80 rounded-2xl p-6 bg-muted/10 hover:bg-muted/20 transition-colors text-center cursor-pointer relative mt-2">
                        <Input 
                          id="gallery-images-upload"
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleGalleryImagesChange} 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="flex flex-col items-center justify-center pointer-events-none py-2 w-full">
                          <ImageIcon className="w-10 h-10 text-amber-500 mb-2" />
                          <p className="text-sm font-bold text-foreground">
                            Tap to add photographs from device
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Select multiple files simultaneously, or tap to add more.</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                        Story & Context *
                      </label>
                      <textarea 
                        required
                        value={galleryDesc}
                        onChange={(e) => setGalleryDesc(e.target.value)}
                        className="flex min-h-[160px] w-full rounded-2xl border border-border/80 bg-background p-4 text-sm leading-relaxed font-normal shadow-xs focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                        placeholder="Provide detailed captions and background context for this photographic journey..."
                      ></textarea>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-13 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-mono" 
                      disabled={submitting}
                    >
                      <ImageIcon className="w-5 h-5" />
                      {submitting ? 'UPLOADING TO CLOUDINARY...' : 'PUBLISH PHOTO GALLERY'}
                    </Button>
                  </form>
                )}

                {/* FORM 3: VIDEO NEWS (NEW FEATURE) */}
                {submissionType === 'video' && (
                  <form onSubmit={handleVideoSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5 font-mono flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5" /> Video Report Headline *
                      </label>
                      <Input 
                        required 
                        value={videoTitle} 
                        onChange={(e) => setVideoTitle(e.target.value)} 
                        placeholder="e.g., BREAKING VIDEO: Emergency Crews Respond to Port Flooding" 
                        className="h-12 rounded-xl text-base font-bold bg-muted/20 border-border/80 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* Source Selection Toggle */}
                    <div className="flex bg-muted/30 p-1 rounded-xl border border-border/80">
                      <button
                        type="button"
                        onClick={() => setVideoSourceType('url')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          videoSourceType === 'url' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        🔗 Embed External URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoSourceType('upload')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          videoSourceType === 'upload' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        📁 Upload Local Video
                      </button>
                    </div>

                    {videoSourceType === 'url' ? (
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Video Source URL *
                        </label>
                        <Input 
                          required 
                          value={videoUrl} 
                          onChange={(e) => setVideoUrl(e.target.value)} 
                          placeholder="Paste YouTube Embed URL, Vimeo link, or Direct MP4 stream URL" 
                          className="h-12 rounded-xl text-sm font-mono font-medium bg-muted/20 border-border/80 focus:border-blue-500"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          💡 Tip: For YouTube, use embed URL (e.g. <code className="text-blue-500">https://www.youtube.com/embed/XXXX</code>).
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Upload Local Video File *
                        </label>
                        <div className="border-2 border-dashed border-blue-500/40 rounded-2xl p-6 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-center cursor-pointer relative">
                          <Input 
                            id="video-file-upload"
                            type="file" 
                            accept="video/*" 
                            required
                            onChange={(e) => setVideoFile(e.target.files[0])} 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          />
                          <div className="flex flex-col items-center justify-center pointer-events-none py-2 w-full">
                            {videoFile ? (
                              <video src={URL.createObjectURL(videoFile)} className="w-full max-h-40 rounded-lg mb-3 object-contain bg-black/50" />
                            ) : (
                              <UploadCloud className="w-10 h-10 text-blue-500 mb-2" />
                            )}
                            <p className="text-sm font-bold text-foreground">
                              {videoFile ? `✓ ${videoFile.name} (${(videoFile.size / (1024 * 1024)).toFixed(2)} MB)` : 'Tap to upload local MP4/WEBM video file'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1 font-mono">Max size: 100MB | Handled via secure stream</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Category *
                        </label>
                        <select 
                          value={videoCategory} 
                          onChange={(e) => setVideoCategory(e.target.value)}
                          className="flex h-12 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm font-bold capitalize shadow-xs focus:ring-2 focus:ring-blue-500/50 outline-none transition-colors"
                        >
                          {dbCategories.filter(cat => !cat.contentTypes || cat.contentTypes.includes('video')).map(cat => (
                            <option key={cat._id} value={cat.name.toLowerCase()}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Tags (comma separated)
                        </label>
                        <Input 
                          value={videoTags} 
                          onChange={(e) => setVideoTags(e.target.value)} 
                          placeholder="e.g. video, sports" 
                          className="h-12 rounded-xl text-sm font-semibold bg-muted/20 border-border/80"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                          Video Duration *
                        </label>
                        <Input 
                          value={videoDuration} 
                          onChange={(e) => setVideoDuration(e.target.value)} 
                          placeholder="e.g. 03:45 or 12:30" 
                          className="h-12 rounded-xl text-sm font-bold font-mono bg-muted/20 border-border/80"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                        Custom Thumbnail Cover Photo (Optional)
                      </label>
                      <div className="border-2 border-dashed border-border/80 rounded-2xl p-4 bg-muted/10 hover:bg-muted/20 transition-colors text-center cursor-pointer relative">
                        <Input 
                          id="video-thumbnail-upload"
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => setVideoThumbnail(e.target.files[0])} 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="flex flex-col items-center justify-center pointer-events-none py-2">
                          <ImageIcon className="w-8 h-8 text-blue-500 mb-1.5" />
                          <p className="text-sm font-bold text-foreground">
                            {videoThumbnail ? videoThumbnail.name : 'Tap to upload high-definition video cover thumbnail'}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Uploaded directly to RitzlaNews media storage</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                        Video Story Summary *
                      </label>
                      <textarea 
                        required
                        value={videoDesc}
                        onChange={(e) => setVideoDesc(e.target.value)}
                        className="flex min-h-[160px] w-full rounded-2xl border border-border/80 bg-background p-4 text-sm leading-relaxed font-normal shadow-xs focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                        placeholder="Provide executive summary, interview timestamps, or on-the-scene context for this video report..."
                      ></textarea>
                    </div>

                    <div className="flex items-center gap-2 pt-1 pb-2">
                      <input 
                        type="checkbox" 
                        id="isShort-toggle"
                        checked={videoIsShort}
                        onChange={(e) => setVideoIsShort(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-border"
                      />
                      <label htmlFor="isShort-toggle" className="text-xs font-bold text-foreground cursor-pointer">
                        Mark as Vertical Short / Quick Clip (appears in Reels & Shorts carousel)
                      </label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-13 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-mono" 
                      disabled={submitting}
                    >
                      <Video className="w-5 h-5" />
                      {submitting ? 'PUBLISHING TO STREAM...' : 'PUBLISH VIDEO NEWS NOW'}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border/60 rounded-3xl p-10 shadow-sm h-fit text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center mb-5 text-rose-500">
                  <XCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black mb-2 text-foreground font-serif">Reporter Access Disabled</h2>
                <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                  Your current identity token does not have editorial write clearance (<code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">create_content</code>). If you recently upgraded your credentials, try logging out and back in, or check with the newsroom desk.
                </p>
              </div>
            )}
          </div>

          {/* Content Timeline / Submissions Log (Col Span 5) */}
          <div className={`lg:col-span-5 ${mobileView === 'timeline' ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-7 shadow-sm">
              <div className="flex flex-col gap-3 mb-6 pb-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-foreground font-serif tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-red-600" /> My Content Log
                  </h2>
                  <span className="text-xs font-bold font-mono px-2.5 py-1 bg-muted rounded-full text-muted-foreground">
                    {filteredContent.length} Items
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {['ALL', 'ARTICLE', 'GALLERY', 'VIDEO', 'DRAFT'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterType(tab)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase font-mono tracking-wider shrink-0 transition-all ${
                        filterType === tab 
                          ? 'bg-foreground text-background shadow-2xs' 
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {tab === 'ALL' ? 'All Feed' : tab}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground font-mono">Syncing Editorial Logs...</p>
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="text-center py-14 px-6 border-2 border-dashed border-border/60 rounded-2xl">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <h3 className="font-extrabold text-base text-foreground font-serif">No Content Matches Filter</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    {filterType === 'ALL' ? 'You have not submitted any reports or video stories yet.' : `No items found under the ${filterType} status category.`}
                  </p>
                  {filterType !== 'ALL' && (
                    <Button variant="ghost" size="sm" onClick={() => setFilterType('ALL')} className="mt-4 text-xs font-bold text-red-600">
                      Show All Content
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
                  {filteredContent.map((item) => (
                    <div key={`${item.contentType}-${item._id}`} className="bg-muted/20 hover:bg-muted/40 border border-border/70 rounded-2xl p-4 transition-all duration-200 shadow-2xs group flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-red-600/10 text-red-600 border border-red-600/20 px-2 py-0.5 rounded font-mono">
                              {item.category || 'NEWS'}
                            </span>
                            
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 bg-muted px-2 py-0.5 rounded font-mono">
                              {item.contentType === 'ARTICLE' && <FileEdit className="w-3 h-3 text-red-500" />}
                              {item.contentType === 'GALLERY' && <ImageIcon className="w-3 h-3 text-amber-500" />}
                              {item.contentType === 'VIDEO' && <Video className="w-3 h-3 text-blue-500" />}
                              {item.contentType} {item.duration ? `(${item.duration})` : ''}
                            </span>
                          </div>
                          
                          <h3 className="font-bold text-base text-foreground group-hover:text-red-600 transition-colors leading-snug line-clamp-2 font-serif">
                            {item.title}
                          </h3>
                          
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              <Eye className="w-3 h-3" /> {Number(item.views || 0).toLocaleString()} views
                            </span>
                          </div>
                        </div>

                        {/* Status & Action Badge */}
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          {(item.status === 'approved' || (item.contentType === 'VIDEO' && !item.status)) && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/20 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" /> LIVE
                            </span>
                          )}
                          {item.status === 'scheduled' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20 font-mono">
                              <Clock className="w-3.5 h-3.5" /> SCHEDULED
                            </span>
                          )}
                          {item.status === 'draft' && (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-zinc-500 bg-zinc-500/10 px-2.5 py-1 rounded-xl border border-zinc-500/20 font-mono">
                                <FileEdit className="w-3 h-3" /> DRAFT
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-border hover:bg-muted text-foreground"
                                onClick={() => handleEditDraft(item)}
                              >
                                Resume Edit
                              </Button>
                            </div>
                          )}
                          {item.status === 'rejected' && (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600 bg-rose-500/15 px-2.5 py-1 rounded-xl border border-rose-500/20 font-mono">
                                <XCircle className="w-3.5 h-3.5" /> REJECTED
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                                onClick={() => handleEditDraft(item)}
                              >
                                Fix & Resubmit
                              </Button>
                            </div>
                          )}
                          {item.status === 'pending' && (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-500/20 font-mono animate-pulse">
                                <Clock className="w-3.5 h-3.5" /> IN REVIEW
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2.5 text-[11px] font-bold rounded-lg text-muted-foreground hover:text-foreground"
                                onClick={() => handleEditDraft(item)}
                              >
                                Edit Post
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Editorial Feedback box for rejected posts */}
                      {item.status === 'rejected' && item.rejectionReason && (
                        <div className="mt-3.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                          <span className="font-extrabold uppercase tracking-wider font-mono flex items-center gap-1.5 mb-1 text-[10px]">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Editor Revision Feedback:
                          </span>
                          <p className="font-medium text-foreground/90 pl-5 leading-normal">{item.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
