import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Filter, Eye, FileText, Image as ImageIcon, PlaySquare, CheckCircle, Clock, XCircle, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/ui/button';

export default function ContentManagement() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const [newsRes, galleriesRes, videosRes] = await Promise.all([
        api.get('/news?allStatus=true'),
        api.get('/photo-galleries?allStatus=true'),
        api.get('/videos')
      ]);

      const combined = [
        ...newsRes.data.map(i => ({ ...i, type: 'article' })),
        ...galleriesRes.data.map(i => ({ ...i, type: 'gallery' })),
        ...videosRes.data.map(i => ({ ...i, type: 'video' }))
      ];

      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setContent(combined);
    } catch (error) {
      console.error('Failed to fetch content', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      if (type === 'article') await api.delete(`/news/${id}`);
      else if (type === 'gallery') await api.delete(`/photo-galleries/${id}`);
      else if (type === 'video') await api.delete(`/videos/${id}`);
      
      setContent(content.filter(item => item._id !== id));
    } catch (error) {
      console.error('Failed to delete', error);
      alert('Failed to delete post');
    }
  };

  const handleViewPost = (id, type) => {
    const newParams = new URLSearchParams(searchParams);
    if (type === 'article') {
      newParams.set('articleId', id);
    } else if (type === 'video') {
      newParams.set('videoId', id);
    } else if (type === 'gallery') {
      newParams.set('galleryId', id);
    }
    setSearchParams(newParams, { replace: true });
  };

  const openEditModal = (item) => {
    setEditItem({ ...item }); // clone to avoid direct mutation
    setIsEditModalOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      const { _id, type, title, content: itemContent, description, category, videoUrl, commentSettings } = editItem;
      
      let payload = {};
      let endpoint = '';
      
      if (type === 'article') {
        endpoint = `/news/${_id}`;
        payload = { title, content: itemContent, category, commentSettings };
      } else if (type === 'gallery') {
        endpoint = `/photo-galleries/${_id}`;
        payload = { title, description, category, commentSettings };
      } else if (type === 'video') {
        endpoint = `/videos/${_id}`;
        payload = { title, description, category, videoUrl, commentSettings };
      }

      const res = await api.put(endpoint, payload);
      
      // Update local state
      setContent(content.map(c => c._id === _id ? { ...c, ...payload } : c));
      setIsEditModalOpen(false);
      setEditItem(null);
    } catch (error) {
      console.error('Failed to update post', error);
      alert('Failed to update post');
    }
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type) => {
    switch(type) {
      case 'article': return <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100"><FileText className="w-5 h-5 text-blue-600" /></div>;
      case 'gallery': return <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100"><ImageIcon className="w-5 h-5 text-purple-600" /></div>;
      case 'video': return <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100"><PlaySquare className="w-5 h-5 text-rose-600" /></div>;
      default: return <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100"><FileText className="w-5 h-5 text-gray-600" /></div>;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'pending': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-yellow-50 text-yellow-700 border border-yellow-200"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="text-gray-400 text-xs font-bold">N/A</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold font-serif text-gray-900 tracking-tight">Content Management</h2>
          <p className="text-gray-500 mt-1 text-sm">Search, update, and manage all posts across the platform.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-72 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by title or category..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative shrink-0 w-full sm:w-auto">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              className="w-full sm:w-auto pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-sm cursor-pointer text-sm font-medium text-gray-700"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Content</option>
              <option value="article">Articles</option>
              <option value="gallery">Photo Galleries</option>
              <option value="video">Videos</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 backdrop-blur-sm text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-6 py-5 font-semibold">Post Details</th>
                  <th className="px-6 py-5 font-semibold">Type</th>
                  <th className="px-6 py-5 font-semibold">Status</th>
                  <th className="px-6 py-5 font-semibold">Date</th>
                  <th className="px-6 py-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContent.map(item => (
                  <tr key={item._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {getTypeIcon(item.type)}
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 max-w-sm">{item.title}</div>
                          <div className="text-xs font-medium text-gray-500 mt-1 px-2 py-0.5 bg-gray-100 rounded-full inline-block capitalize">{item.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider capitalize ${
                        item.type === 'article' ? 'bg-blue-50 text-blue-700' :
                        item.type === 'gallery' ? 'bg-purple-50 text-purple-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleViewPost(item._id, item.type)}
                          className="p-2 text-green-600 bg-white border border-green-200 hover:bg-green-50 hover:border-green-300 rounded-lg transition-all shadow-sm hover:-translate-y-0.5"
                          title="View Live"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-2 text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 hover:border-blue-300 rounded-lg transition-all shadow-sm hover:-translate-y-0.5"
                          title="Edit Content"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item._id, item.type)}
                          className="p-2 text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-lg transition-all shadow-sm hover:-translate-y-0.5"
                          title="Delete Content"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredContent.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No content found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold font-serif text-gray-900 capitalize flex items-center gap-2">
                <Edit className="w-5 h-5 text-red-600" />
                Edit {editItem.type}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                <input 
                  type="text" 
                  value={editItem.title || ''} 
                  onChange={e => setEditItem({...editItem, title: e.target.value})}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                <input 
                  type="text" 
                  value={editItem.category || ''} 
                  onChange={e => setEditItem({...editItem, category: e.target.value})}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all capitalize"
                  required
                />
              </div>

              {editItem.type === 'article' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Content</label>
                  <textarea 
                    value={editItem.content || ''} 
                    onChange={e => setEditItem({...editItem, content: e.target.value})}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all h-48 resize-none"
                    required
                  />
                </div>
              )}

              {(editItem.type === 'gallery' || editItem.type === 'video') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea 
                    value={editItem.description || ''} 
                    onChange={e => setEditItem({...editItem, description: e.target.value})}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all h-32 resize-none"
                    required
                  />
                </div>
              )}

              {editItem.type === 'video' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Video URL</label>
                  <input 
                    type="url" 
                    value={editItem.videoUrl || ''} 
                    onChange={e => setEditItem({...editItem, videoUrl: e.target.value})}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comment Settings</label>
                <div className="relative">
                  <select
                    value={editItem.commentSettings || 'all'}
                    onChange={e => setEditItem({...editItem, commentSettings: e.target.value})}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 appearance-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer font-medium text-gray-700"
                  >
                    <option value="all">Allow All Users</option>
                    <option value="staff_only">Allow Staff Only (Reporters/Editors)</option>
                    <option value="off">Turn Off Comments</option>
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl border-gray-200 hover:bg-gray-50">Cancel</Button>
                <Button type="submit" className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
