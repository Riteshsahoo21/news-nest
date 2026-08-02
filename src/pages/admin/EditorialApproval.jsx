import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { CheckCircle, XCircle, Eye, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const EditorialApproval = () => {
  const [pendingArticles, setPendingArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPendingNews();
  }, []);

  const fetchPendingNews = async () => {
    try {
      setLoading(true);
      const [newsRes, galleriesRes] = await Promise.all([
        api.get('/news/pending'),
        api.get('/photo-galleries/pending')
      ]);
      
      const combined = [
        ...newsRes.data.map(item => ({ ...item, contentType: 'article' })),
        ...galleriesRes.data.map(item => ({ ...item, contentType: 'gallery' }))
      ];
      
      // Sort newest first
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setPendingArticles(combined);
    } catch (error) {
      console.error('Failed to fetch pending content', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item) => {
    try {
      if (item.contentType === 'article') {
        await api.put(`/news/${item._id}/approve`);
      } else {
        await api.put(`/photo-galleries/${item._id}/approve`);
      }
      setPendingArticles(pendingArticles.filter(a => a._id !== item._id));
      if (selectedArticle?._id === item._id) setSelectedArticle(null);
    } catch (error) {
      console.error('Failed to approve item', error);
    }
  };

  const handleReject = async (item) => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    try {
      if (item.contentType === 'article') {
        await api.put(`/news/${item._id}/reject`, { reason: rejectReason });
      } else {
        await api.put(`/photo-galleries/${item._id}/reject`, { reason: rejectReason });
      }
      setPendingArticles(pendingArticles.filter(a => a._id !== item._id));
      if (selectedArticle?._id === item._id) {
        setSelectedArticle(null);
        setRejectReason('');
      }
    } catch (error) {
      console.error('Failed to reject item', error);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Editorial Approvals</h2>
        <p className="text-gray-500 mt-1">Review and approve articles submitted by reporters.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* List Column */}
        <div className="md:col-span-1 space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          {pendingArticles.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
              <p className="text-gray-500">All caught up! No pending articles.</p>
            </div>
          ) : (
            pendingArticles.map(article => (
              <div 
                key={article._id}
                onClick={() => setSelectedArticle(article)}
                className={`p-4 bg-white rounded-lg border cursor-pointer transition-colors ${selectedArticle?._id === article._id ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 hover:border-red-300'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-600 uppercase tracking-wider bg-red-50 px-2 py-1 rounded">{article.category}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded border border-gray-200">{article.contentType}</span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(article.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold text-gray-900 line-clamp-2 mb-1">{article.title}</h3>
                <p className="text-sm text-gray-500">By {article.authorId?.fullName || article.author || 'Unknown'}</p>
              </div>
            ))
          )}
        </div>

        {/* Review Column */}
        <div className="md:col-span-2">
          {selectedArticle ? (
            <Card className="h-full flex flex-col shadow-sm border-gray-200">
              <CardContent className="p-6 flex-1 overflow-y-auto">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-2">{selectedArticle.title}</h1>
                  {selectedArticle.subtitle && <h2 className="text-lg text-gray-600 mb-4">{selectedArticle.subtitle}</h2>}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>By {selectedArticle.authorId?.fullName || selectedArticle.author}</span>
                    <span>•</span>
                    <span>{new Date(selectedArticle.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {selectedArticle.contentType === 'article' && selectedArticle.imageUrl && (
                  <img 
                    src={selectedArticle.imageUrl.startsWith('http') ? selectedArticle.imageUrl : `http://localhost:5000/${selectedArticle.imageUrl.replace('\\', '/')}`}
                    alt={selectedArticle.title}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}

                {selectedArticle.contentType === 'gallery' && selectedArticle.photos && selectedArticle.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {selectedArticle.photos.slice(0, 4).map((photo, i) => (
                      <img 
                        key={i}
                        src={photo.url.startsWith('http') ? photo.url : `http://localhost:5000/${photo.url.replace('\\', '/')}`}
                        alt={`${selectedArticle.title} ${i}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                <div className="prose max-w-none mb-8">
                  <p className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {selectedArticle.contentType === 'article' ? selectedArticle.content : selectedArticle.description}
                  </p>
                </div>
              </CardContent>
              
              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-lg space-y-4">
                <div className="flex gap-4">
                  <Button 
                    onClick={() => handleApprove(selectedArticle)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <CheckCircle className="h-4 w-4" /> Approve & Publish
                  </Button>
                </div>
                
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Rejection Feedback
                  </label>
                  <textarea
                    placeholder="Provide a reason for rejection..."
                    className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                    rows="2"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  ></textarea>
                  <Button 
                    onClick={() => handleReject(selectedArticle)}
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2"
                  >
                    <XCircle className="h-4 w-4" /> Return to Reporter
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 border border-gray-200 border-dashed rounded-lg">
              <div className="text-center text-gray-500">
                <Eye className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p>Select an article from the queue to review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorialApproval;
