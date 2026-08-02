import { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { ShieldCheck, Check, X, Image as ImageIcon, FileEdit } from 'lucide-react';

export default function EditorDashboard() {
  const [pendingNews, setPendingNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canApprove, setCanApprove] = useState(true);

  useEffect(() => {
    fetchPendingNews();
  }, []);

  const fetchPendingNews = async () => {
    try {
      const userRes = await api.get('/user/me');
      const permissions = userRes.data.permissions || [];
      const hasApprovePerm = permissions.includes('approve_content');
      setCanApprove(hasApprovePerm);

      if (!hasApprovePerm) {
        setLoading(false);
        return; // Don't fetch pending news if they can't approve
      }

      const [newsRes, galleryRes] = await Promise.all([
        api.get('/news/pending'),
        api.get('/photo-galleries/pending')
      ]);
      
      const combined = [
        ...newsRes.data.map(n => ({...n, type: 'article'})),
        ...galleryRes.data.map(g => ({...g, type: 'gallery'}))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setPendingNews(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, type, action) => {
    try {
      const endpoint = type === 'article' ? `/news/${id}` : `/photo-galleries/${id}`;
      
      if (action === 'approve') {
        await api.put(`${endpoint}/approve`);
      } else {
        await api.put(`${endpoint}/reject`, { reason: 'Rejected by Editor' });
      }
      
      // Remove from list
      setPendingNews(pendingNews.filter(n => n._id !== id));
    } catch (err) {
      console.error(err);
      alert(`Failed to update ${type} status`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Editor Dashboard</h1>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Pending Articles</h2>
        <p className="text-muted-foreground text-sm">Review articles submitted by reporters before they go live on the platform.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading pending articles...</p>
      ) : !canApprove ? (
        <div className="text-center p-12 border border-dashed border-red-200 rounded-xl bg-red-50/50">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-red-900 mb-2">Approvals Disabled</h2>
          <p className="text-red-700 max-w-md mx-auto">
            You have been stopped from approving posts. Your role does not currently have the "Approve Content" permission. Please contact an administrator.
          </p>
        </div>
      ) : pendingNews.length === 0 ? (
        <div className="text-center p-10 border border-dashed rounded-xl bg-muted/20 text-muted-foreground">
          No pending articles to review right now! Great job.
        </div>
      ) : (
        <div className="space-y-6">
          {pendingNews.map((article) => (
            <div key={article._id} className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
              
              {/* Image Preview */}
              <div className="shrink-0 w-full md:w-48 h-48 md:h-32 bg-muted rounded-xl overflow-hidden relative shadow-sm">
                {(article.imageUrl || article.coverImage || (article.photos && article.photos.length > 0 && article.photos[0].url)) ? (
                  <img 
                    src={article.imageUrl || article.coverImage || article.photos[0].url} 
                    alt={article.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-1 rounded">
                      {article.category}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center bg-muted px-2 py-1 rounded">
                      {article.type === 'article' ? <FileEdit className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                      {article.type}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    By {article.author || article.photographer || 'Anonymous'} • {new Date(article.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold mb-3">{article.title}</h3>
                
                <div className="bg-muted/50 p-4 rounded-lg text-sm mb-6 max-h-32 overflow-y-auto">
                  {article.content || article.description}
                  
                  {article.type === 'gallery' && article.photos && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                       {article.photos.map((photo, i) => (
                         <div key={i} className="h-12 bg-muted rounded overflow-hidden">
                           <img src={photo.url} alt="" className="w-full h-full object-cover" />
                         </div>
                       ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 border-t pt-4">
                  <Button 
                    onClick={() => handleAction(article._id, article.type, 'approve')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" /> Approve & Publish
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => handleAction(article._id, article.type, 'reject')}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <X className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
