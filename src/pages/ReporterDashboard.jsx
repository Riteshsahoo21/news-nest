import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FileEdit, CheckCircle2, XCircle, Clock, Image as ImageIcon } from 'lucide-react';

export default function ReporterDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);

  const [submissionType, setSubmissionType] = useState('article'); // 'article' or 'gallery'
  const [galleries, setGalleries] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  
  // Article Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('politics');
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitAction, setSubmitAction] = useState('submit');

  // Gallery Form State
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryDesc, setGalleryDesc] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('politics');
  const [photographerName, setPhotographerName] = useState(''); 
  const [galleryImages, setGalleryImages] = useState(null); 

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const [newsRes, galleryRes, catRes, userRes] = await Promise.all([
        api.get('/news/my-submissions'),
        api.get('/photo-galleries/my-submissions'),
        api.get('/categories'),
        api.get('/user/me') // Fetch user's allowed categories
      ]);
      setSubmissions(newsRes.data);
      setGalleries(galleryRes.data);
      
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
      if (catRes.data && catRes.data.length > 0) {
        catRes.data.forEach(dbCat => {
          if (!merged.some(c => c.name.toLowerCase() === dbCat.name.toLowerCase())) {
            merged.push(dbCat);
          }
        });
      }
      const finalCats = hasAll ? merged : merged.filter(c => allowedCats.includes(c.name.toLowerCase()));
      setDbCategories(finalCats);
      
      // Update default selected category if current one is not in finalCats
      if (finalCats.length > 0) {
        if (!finalCats.some(c => c.name.toLowerCase() === category)) {
          setCategory(finalCats[0].name.toLowerCase());
        }
        if (!finalCats.some(c => c.name.toLowerCase() === galleryCategory)) {
          setGalleryCategory(finalCats[0].name.toLowerCase());
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      formData.append('author', user.fullName);
      formData.append('action', submitAction);
      
      if (scheduledAt) formData.append('scheduledAt', scheduledAt);
      if (image) formData.append('image', image);

      if (editingId) {
        await api.put(`/news/draft/${editingId}`, formData);
      } else {
        await api.post('/news', formData);
      }

      setMessage(`Article ${submitAction === 'draft' ? 'saved as draft' : 'submitted successfully'}!`);
      setTitle('');
      setContent('');
      setImage(null);
      setScheduledAt('');
      setEditingId(null);
      fetchSubmissions(); // Refresh list
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to submit article');
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
    setImage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      formData.append('photographer', photographerName || user.fullName);
      
      if (galleryImages) {
        for (let i = 0; i < galleryImages.length; i++) {
          formData.append('images', galleryImages[i]);
        }
      }
      
      await api.post('/photo-galleries', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('Photo Gallery submitted successfully for review!');
      setGalleryTitle('');
      setGalleryDesc('');
      setPhotographerName('');
      setGalleryImages(null);
      
      // Reset the file input visually
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <FileEdit className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Reporter Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Submit Form */}
        {canSubmit ? (
          <div className="bg-card border rounded-xl p-6 shadow-sm h-fit">
            <div className="mb-6">
            <div className="mb-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-1">{editingId ? 'Edit Draft' : 'Create New Post'}</h2>
                <p className="text-sm text-muted-foreground mb-4">What would you like to submit today?</p>
              </div>
              {editingId && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditingId(null);
                  setTitle('');
                  setContent('');
                  setScheduledAt('');
                }}>
                  Cancel Edit
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button 
                onClick={() => setSubmissionType('article')}
                className={`py-3 flex flex-col items-center justify-center rounded-xl border-2 transition-all ${
                  submissionType === 'article' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <FileEdit className="w-6 h-6 mb-2" />
                <span className="font-semibold text-sm">News Article</span>
              </button>
              
              <button 
                onClick={() => setSubmissionType('gallery')}
                className={`py-3 flex flex-col items-center justify-center rounded-xl border-2 transition-all ${
                  submissionType === 'gallery' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <ImageIcon className="w-6 h-6 mb-2" />
                <span className="font-semibold text-sm">Photo Gallery</span>
              </button>
            </div>
          </div>
          
          {message && (
            <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          {submissionType === 'article' ? (
            <form onSubmit={handleArticleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Headline</label>
                <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter breaking news headline" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 capitalize"
                >
                  {dbCategories.map(cat => (
                    <option key={cat._id} value={cat.name.toLowerCase()}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cover Image</label>
                <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
                <p className="text-xs text-muted-foreground mt-1">Leave empty if you don't have an image.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea 
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Write the full article content here..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Schedule Publish (Optional)</label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Leave empty to publish/submit immediately.</p>
              </div>

              <div className="flex gap-4 pt-2">
                <Button 
                  type="submit" 
                  variant="outline"
                  className="w-full" 
                  onClick={() => setSubmitAction('draft')}
                  disabled={submitting}
                >
                  Save as Draft
                </Button>
                <Button 
                  type="submit" 
                  className="w-full" 
                  onClick={() => setSubmitAction(scheduledAt ? 'schedule' : 'submit')}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : (scheduledAt ? 'Schedule Post' : (editingId ? 'Update Article' : 'Submit Article'))}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleGallerySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Gallery Title</label>
                <Input required value={galleryTitle} onChange={(e) => setGalleryTitle(e.target.value)} placeholder="Enter gallery title" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select 
                  value={galleryCategory} 
                  onChange={(e) => setGalleryCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 capitalize"
                >
                  {dbCategories.map(cat => (
                    <option key={cat._id} value={cat.name.toLowerCase()}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  required
                  value={galleryDesc}
                  onChange={(e) => setGalleryDesc(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Provide context for these photos..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Photographer Name</label>
                <Input value={photographerName} onChange={(e) => setPhotographerName(e.target.value)} placeholder="e.g. Rajesh Nair (Associated Press)" />
                <p className="text-xs text-muted-foreground mt-1">Leave empty to use your own name.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Upload Photos</label>
                <Input 
                  id="gallery-images-upload"
                  type="file" 
                  accept="image/*" 
                  multiple 
                  required
                  onChange={(e) => setGalleryImages(e.target.files)} 
                />
                <p className="text-xs text-muted-foreground mt-1">Select multiple images (Hold Ctrl/Cmd to select multiple). Images will be uploaded to Cloudinary.</p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Photo Gallery'}
              </Button>
            </form>
          )}
        </div>
        ) : (
          <div className="bg-card border rounded-xl p-8 shadow-sm h-fit text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Submissions Disabled</h2>
            <p className="text-muted-foreground max-w-sm">
              You do not have the necessary permissions to submit new content. If you believe this is an error, please contact an administrator to update your role permissions.
            </p>
          </div>
        )}

        {/* My Submissions */}
        <div>
          <h2 className="text-xl font-semibold mb-6">My Submissions</h2>
          
          {loading ? (
            <p className="text-muted-foreground">Loading submissions...</p>
          ) : (submissions.length === 0 && galleries.length === 0) ? (
            <div className="text-center p-10 border border-dashed rounded-xl text-muted-foreground">
              You haven't submitted any content yet.
            </div>
          ) : (
            <div className="space-y-4">
              {[...submissions.map(s => ({...s, type: 'article'})), ...galleries.map(g => ({...g, type: 'gallery'}))]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((item) => (
                <div key={`${item.type}-${item._id}`} className="bg-card border rounded-xl p-4 shadow-sm flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center">
                          {item.type === 'article' ? <FileEdit className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                          {item.type}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg truncate">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Submitted on {new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end">
                      {item.status === 'approved' && (
                        <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approved
                        </span>
                      )}
                      {item.status === 'scheduled' && (
                        <span className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          <Clock className="w-4 h-4 mr-1.5" /> Scheduled for {new Date(item.scheduledAt).toLocaleDateString()}
                        </span>
                      )}
                      {item.status === 'draft' && (
                        <div className="flex flex-col items-end gap-2">
                          <span className="flex items-center text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                            <FileEdit className="w-4 h-4 mr-1.5" /> Draft
                          </span>
                          <Button variant="outline" size="sm" onClick={() => handleEditDraft(item)}>
                            Edit Draft
                          </Button>
                        </div>
                      )}
                      {item.status === 'rejected' && (
                        <div className="flex flex-col items-end gap-2">
                          <span className="flex items-center text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                            <XCircle className="w-4 h-4 mr-1.5" /> Rejected
                          </span>
                          <Button variant="outline" size="sm" onClick={() => handleEditDraft(item)}>
                            Edit & Resubmit
                          </Button>
                        </div>
                      )}
                      {item.status === 'pending' && (
                        <div className="flex flex-col items-end gap-2">
                          <span className="flex items-center text-sm font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg">
                            <Clock className="w-4 h-4 mr-1.5" /> Pending
                          </span>
                          <Button variant="outline" size="sm" onClick={() => handleEditDraft(item)}>
                            Edit Submission
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {item.status === 'rejected' && item.rejectionReason && (
                    <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-lg text-sm text-red-800">
                      <span className="font-semibold flex items-center mb-1">
                        <XCircle className="w-4 h-4 mr-1.5 text-red-500" />
                        Editor Feedback:
                      </span>
                      <p className="pl-5.5 text-red-700/90">{item.rejectionReason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
