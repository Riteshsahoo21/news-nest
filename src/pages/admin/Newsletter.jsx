import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Trash2, Send, CheckCircle, Mail, Clock, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function Newsletter() {
  const [activeTab, setActiveTab] = useState('subscribers'); // 'subscribers' | 'campaigns'
  
  // Subscribers state
  const [subscribers, setSubscribers] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Campaigns state
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCamps, setLoadingCamps] = useState(false);
  
  // Manual Campaign state
  const [subject, setSubject] = useState('');
  const [audience, setAudience] = useState('all');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const quillRef = useRef(null);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        try {
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          
          // Use the secure Cloudinary backend upload endpoint
          const res = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (res.data.url) {
            quill.insertEmbed(range.index, 'image', res.data.url);
          }
        } catch (error) {
          console.error("Image upload failed:", error);
          alert("Image upload failed. Check console.");
        }
      }
    };
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [imageHandler]);

  useEffect(() => {
    if (activeTab === 'subscribers') {
      fetchSubscribers();
    } else {
      fetchCampaigns();
    }
  }, [activeTab]);

  const fetchSubscribers = async () => {
    setLoadingSubs(true);
    try {
      const res = await api.get('/newsletter/subscribers');
      setSubscribers(res.data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubs(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoadingCamps(true);
    try {
      const res = await api.get('/newsletter/campaigns');
      setCampaigns(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCamps(false);
    }
  };

  const handleDeleteSubscriber = async (id) => {
    if (!window.confirm("Are you sure you want to remove this subscriber?")) return;
    try {
      await api.delete(`/newsletter/subscribers/${id}`);
      setSubscribers(subscribers.filter(sub => sub._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendCampaign = async (e) => {
    e.preventDefault();
    if (!subject || !content) return;
    
    setSending(true);
    setFeedback(null);
    try {
      const res = await api.post('/newsletter/campaigns/send', { subject, content });
      setFeedback({ type: 'success', text: res.data.message });
      setSubject('');
      setContent('');
      fetchCampaigns(); // refresh list
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to send campaign' });
    } finally {
      setSending(false);
    }
  };

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(sub => 
      sub.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subscribers, searchQuery]);

  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage) || 1;
  
  const paginatedSubscribers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubscribers.slice(start, start + itemsPerPage);
  }, [filteredSubscribers, currentPage]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Newsletter Management</h2>
        <p className="text-muted-foreground mt-2">
          Manage your subscribers and blast email campaigns.
        </p>
      </div>

      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-max">
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'subscribers' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Subscribers
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'campaigns' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Campaigns
        </button>
      </div>

      {/* SUBSCRIBERS TAB */}
      {activeTab === 'subscribers' && (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b flex flex-col sm:flex-row gap-4 justify-between items-center">
            <h3 className="font-semibold text-lg flex items-center gap-2 whitespace-nowrap">
              <UserIcon className="w-5 h-5 text-primary" /> Active Subscribers ({subscribers.filter(s => s.isActive).length})
            </h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Search subscribers..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchSubscribers}>Refresh</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Subscribed At</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingSubs ? (
                  <tr><td colSpan="4" className="text-center py-8">Loading...</td></tr>
                ) : paginatedSubscribers.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-8 text-muted-foreground">No subscribers found.</td></tr>
                ) : (
                  paginatedSubscribers.map((sub) => (
                    <tr key={sub._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{sub.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sub.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {sub.isActive ? 'Active' : 'Unsubscribed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSubscriber(sub._id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredSubscribers.length > itemsPerPage && (
            <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSubscribers.length)} of {filteredSubscribers.length} entries
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <div className="text-sm font-medium px-2 text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CAMPAIGNS TAB */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Send Campaign Form */}
          <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
              <Send className="w-5 h-5 text-primary" /> Send Manual Campaign
            </h3>
            <form onSubmit={handleSendCampaign} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Audience</label>
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                  >
                    <option value="all">All Active Subscribers</option>
                    <option value="premium">Premium Members (Coming Soon)</option>
                    <option value="free">Free Users (Coming Soon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject Line</label>
                  <Input 
                    placeholder="e.g. Breaking News: Global Markets Update"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Content (Rich Text)</label>
                <div className="bg-white text-black rounded-md pb-10">
                  <ReactQuill 
                    ref={quillRef}
                    theme="snow" 
                    value={content} 
                    onChange={setContent} 
                    modules={modules}
                    className="h-[250px]"
                    placeholder="Write a beautiful newsletter..."
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Design your email using the rich text editor above. Images and links are supported.</p>
              </div>

              {feedback && (
                <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {feedback.text}
                </div>
              )}

              <Button type="submit" disabled={sending} className="w-full">
                {sending ? 'Sending...' : 'Send to All Active Subscribers'}
              </Button>
            </form>
          </div>

          {/* Campaign History */}
          <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-primary" /> Campaign History
            </h3>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {loadingCamps ? (
                <p className="text-center py-4 text-muted-foreground">Loading...</p>
              ) : campaigns.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No campaigns sent yet.</p>
              ) : (
                campaigns.map((camp) => (
                  <div key={camp._id} className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-foreground truncate pr-4">{camp.subject}</h4>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${camp.type === 'automated' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {camp.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {camp.sentCount} sent
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(camp.createdAt).toLocaleString()}
                      </span>
                      <span className={`font-medium ${camp.status === 'sent' ? 'text-green-600' : 'text-red-600'}`}>
                        {camp.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// Inline UserIcon to avoid importing if it's missing in some setups
function UserIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
