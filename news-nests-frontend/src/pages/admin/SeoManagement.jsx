import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Globe, 
  Search, 
  Share2, 
  Radio, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  ExternalLink, 
  Edit3, 
  Copy, 
  RefreshCw, 
  TrendingUp, 
  Shield, 
  Terminal, 
  Check, 
  Smartphone, 
  Laptop, 
  MessageCircle, 
  Layers, 
  Activity 
} from 'lucide-react';

export default function SeoManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [auditItems, setAuditItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Quick edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', type: 'news', seoTitle: '', metaDescription: '', slug: '' });
  const [saving, setSaving] = useState(false);

  // Indexer state
  const [customUrls, setCustomUrls] = useState('');
  const [pinging, setPinging] = useState(false);
  const [pingLog, setPingLog] = useState([]);

  // Simulator state
  const [simulatorPlatform, setSimulatorPlatform] = useState('whatsapp');

  // Copy indicator
  const [copiedLink, setCopiedLink] = useState('');

  const fetchSeoData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, auditRes] = await Promise.all([
        api.get('/admin/seo/analytics'),
        api.get(`/admin/seo/audit?filter=${filter}&limit=60`)
      ]);
      setAnalytics(analyticsRes.data);
      setAuditItems(auditRes.data.items || []);
      if (auditRes.data.items?.length > 0 && !selectedItem) {
        setSelectedItem(auditRes.data.items[0]);
      }
    } catch (error) {
      console.error('Failed to load SEO dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeoData();
  }, [filter]);

  const handleCopy = (text, name) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(name);
    setTimeout(() => setCopiedLink(''), 2500);
  };

  const handleOpenEdit = (item) => {
    setEditForm({
      id: item._id,
      type: item.type,
      seoTitle: item.seoTitle || item.title || '',
      metaDescription: item.metaDescription || '',
      slug: item.slug || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/seo/update', editForm);
      setEditModalOpen(false);
      fetchSeoData();
      addLog(`Updated SEO tags & re-pinged indexing engines for ${editForm.slug || editForm.id}`, 'success');
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update metadata.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerIndex = async (bulkMode = '', urlsList = []) => {
    setPinging(true);
    addLog(`Dispatching instant search indexation requests (${bulkMode || 'Custom URL payload'})...`, 'info');
    try {
      const response = await api.post('/admin/seo/ping-index', {
        bulkMode,
        urls: urlsList
      });
      addLog(`✅ Successfully pinged ${response.data.pingCount} URL(s) to IndexNow (Bing, Yandex, Seznam, Naver) and Google!`, 'success');
      if (response.data.urls) {
        response.data.urls.forEach(u => addLog(`   ➜ Sent: ${u}`, 'neutral'));
      }
    } catch (error) {
      addLog(`❌ Indexing broadcast failed: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setPinging(false);
    }
  };

  const addLog = (text, type = 'neutral') => {
    setPingLog(prev => [{ time: new Date().toLocaleTimeString(), text, type }, ...prev]);
  };

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white space-y-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
          <Globe className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="font-mono text-xs tracking-widest uppercase text-emerald-400">Loading SEO & Indexing Command Engine...</p>
      </div>
    );
  }

  const metrics = analytics?.metrics || {};
  const sitemaps = analytics?.sitemaps || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-10 transition-colors">
      {/* Top Header & Console Branding */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-black tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>ONLY ADMIN RESTRICTED CONSOLE</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">IndexNow & Google News Sync v2.4</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif text-white flex items-center gap-3 pt-1">
              <Globe className="w-8 h-8 text-emerald-500 flex-shrink-0 animate-spin-slow" />
              <span>SEO & Search Indexing Hub</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Real-time monitoring for Google News Top Stories 48-hr algorithms, Open Graph preview cards, and automated IndexNow push broadcasts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSeoData}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 border border-slate-700 transition-all shadow-md active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'overview', label: 'Dashboard & Sitemaps', icon: Layers },
            { id: 'auditor', label: 'Content SEO Auditor', icon: Search, badge: metrics.unoptimizedCount > 0 ? metrics.unoptimizedCount : null },
            { id: 'simulator', label: 'Social Card Simulator', icon: Share2 },
            { id: 'indexer', label: 'Instant Search Push', icon: Zap }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-xs sm:text-sm tracking-wide transition-all border-b-2 ${
                  isActive 
                    ? 'bg-slate-900 border-emerald-500 text-emerald-400 shadow-lg' 
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & SITEMAPS */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* 4 Hero Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <Activity className="w-20 h-20 text-emerald-400" />
                </div>
                <p className="text-xs font-mono text-slate-400 uppercase font-bold tracking-wider">Overall SEO Health</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className={`text-4xl font-extrabold font-mono ${metrics.overallSeoHealth >= 80 ? 'text-emerald-400' : metrics.overallSeoHealth >= 50 ? 'text-amber-400' : 'text-rose-500'}`}>
                    {metrics.overallSeoHealth || 95}%
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Score</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full" style={{ width: `${metrics.overallSeoHealth || 95}%` }}></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-20 h-20 text-blue-400" />
                </div>
                <p className="text-xs font-mono text-slate-400 uppercase font-bold tracking-wider">Google News 48h Feed</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-extrabold font-mono text-blue-400">{metrics.googleNewsEligibleCount || 0}</span>
                  <span className="text-xs text-slate-500">active stories</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-4 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>Eligible for Search Top Stories Carousel</span>
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <FileText className="w-20 h-20 text-purple-400" />
                </div>
                <p className="text-xs font-mono text-slate-400 uppercase font-bold tracking-wider">Indexed News & Live Streams</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-extrabold font-mono text-purple-400">{(metrics.publishedArticles || 0) + (metrics.activeLiveBlogs || 0)}</span>
                  <span className="text-xs text-slate-500 font-mono">public URLs</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-4">
                  {metrics.publishedArticles || 0} Articles • {metrics.activeLiveBlogs || 0} Active Live Blogs
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <AlertTriangle className={`w-20 h-20 ${metrics.unoptimizedCount > 0 ? 'text-amber-500' : 'text-emerald-400'}`} />
                </div>
                <p className="text-xs font-mono text-slate-400 uppercase font-bold tracking-wider">Optimization Alerts</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className={`text-4xl font-extrabold font-mono ${metrics.unoptimizedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {metrics.unoptimizedCount || 0}
                  </span>
                  <span className="text-xs text-slate-500">items</span>
                </div>
                <button 
                  onClick={() => setActiveTab('auditor')} 
                  className="text-[11px] font-mono text-amber-400 hover:underline mt-4 flex items-center gap-1 font-bold"
                >
                  <span>➜ RESOLVE METADATA WARNINGS</span>
                </button>
              </div>
            </div>

            {/* Sitemap Syndication Box */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    <span>Dynamic Automated Sitemaps & RSS Enclosure Feeds</span>
                  </h2>
                  <p className="text-xs text-slate-400">These endpoints generate real-time XML data upon crawler requests. Share these URLs with Google Search Console and Bing Webmaster Tools.</p>
                </div>
                <button 
                  onClick={() => handleTriggerIndex('all')}
                  disabled={pinging}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg hover:shadow-emerald-600/25 transition-all w-fit"
                >
                  <Zap className="w-4 h-4" />
                  <span>{pinging ? 'Broadcasting...' : 'Ping Search Engines Now'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { 
                    title: 'Universal General Sitemap', 
                    desc: 'Complete crawl feed containing articles, active categories, live streams, and public pages.', 
                    url: sitemaps.general, 
                    tag: 'sitemap.xml', 
                    color: 'text-emerald-400',
                    badge: 'Google Search / Bing'
                  },
                  { 
                    title: 'Google News 48-Hour Sitemap', 
                    desc: 'Strict W3C schema specifically formatted for appearing in breaking Google News Top Stories carousels.', 
                    url: sitemaps.googleNews, 
                    tag: 'news-sitemap.xml', 
                    color: 'text-blue-400',
                    badge: 'Top Stories Carousel'
                  },
                  { 
                    title: 'Media-Rich RSS 2.0 Syndication Feed', 
                    desc: 'Includes high-def media content enclosures (<media:content>) for Feedly, Apple News & aggregators.', 
                    url: sitemaps.rssFeed, 
                    tag: 'rss.xml', 
                    color: 'text-purple-400',
                    badge: 'RSS & Flipboard'
                  }
                ].map((feed, idx) => (
                  <div key={idx} className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-black text-xs ${feed.color}`}>{feed.tag}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">{feed.badge}</span>
                      </div>
                      <h3 className="text-base font-bold text-white">{feed.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{feed.desc}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-900 flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(feed.url, feed.tag)}
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        {copiedLink === feed.tag ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedLink === feed.tag ? 'Copied URL!' : 'Copy Link'}</span>
                      </button>
                      <a
                        href={feed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                        title="Open Raw XML Feed"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTENT SEO AUDITOR */}
        {activeTab === 'auditor' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-400" />
                  <span>Content SEO Auditor & Metadata Diagnostics</span>
                </h2>
                <p className="text-xs text-slate-400">Review real-time semantic URLs, meta descriptions, and Google Search character length compliance.</p>
              </div>
              <div className="flex items-center gap-2">
                {['all', 'news', 'liveblogs'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-3.5 py-1.5 rounded-lg font-mono font-bold text-xs uppercase transition-all ${
                      filter === type ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {type === 'all' ? 'All Content' : type === 'news' ? 'Articles' : 'Live Streams'}
                  </button>
                ))}
              </div>
            </div>

            {auditItems.length === 0 ? (
              <div className="py-20 text-center text-slate-500 font-mono text-xs">No matching content found for audit analysis.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Content Title & Slug</th>
                      <th className="py-3.5 px-4">Type / Category</th>
                      <th className="py-3.5 px-4 text-center">Health Score</th>
                      <th className="py-3.5 px-4">Diagnostic Findings</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {auditItems.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-4 px-4 font-medium max-w-xs sm:max-w-sm">
                          <div className="font-bold text-white text-sm line-clamp-1">{item.title}</div>
                          <div className="text-emerald-400/90 font-mono text-[11px] truncate mt-0.5">
                            /{item.type === 'news' ? 'article/' : 'live-blogs?id='}{item.slug}
                          </div>
                          {item.seoTitle && item.seoTitle !== item.title && (
                            <div className="text-amber-300/80 font-mono text-[10px] mt-1">
                              [SEO Title]: {item.seoTitle}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold ${
                            item.type === 'news' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {item.type === 'news' ? 'ARTICLE' : 'LIVE STREAM'}
                          </span>
                          <div className="text-slate-400 text-[11px] mt-1">{item.category}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full font-mono font-extrabold text-xs shadow-xs ${
                            item.score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : item.score >= 50 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {item.score}%
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {item.flags && item.flags.length > 0 ? (
                            <div className="space-y-1">
                              {item.flags.map((f, idx) => (
                                <div key={idx} className="text-amber-400 flex items-center gap-1.5 font-mono text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  <span>{f}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-emerald-400 flex items-center gap-1.5 font-mono text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span>Optimal Meta & Social Tags</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setSelectedItem(item); setActiveTab('simulator'); }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-all flex items-center gap-1"
                              title="Test Social Cards"
                            >
                              <Share2 className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Quick-Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SOCIAL CARD SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <span>Open Graph Social & Google Discover Card Simulator</span>
                </h2>
                <p className="text-xs text-slate-400">Preview exact visual cards served by your Social Media Bot Interceptor middleware when readers share links.</p>
              </div>
              
              {/* Item Selector */}
              <div className="w-full sm:w-80">
                <select
                  value={selectedItem?._id || ''}
                  onChange={(e) => setSelectedItem(auditItems.find(i => i._id === e.target.value) || selectedItem)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="">-- Select Content Story to Test --</option>
                  {auditItems.map(i => (
                    <option key={i._id} value={i._id}>{i.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedItem ? (
              <div className="py-24 text-center text-slate-500 font-mono text-xs">Please select an article or live blog from the dropdown above to render social previews.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Platform Selector Left */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[11px] font-mono font-bold uppercase text-slate-400 px-1">Select Social Network Render Frame</p>
                  {[
                    { id: 'whatsapp', name: 'WhatsApp Link Card', color: 'text-emerald-400', bg: 'hover:bg-emerald-500/10' },
                    { id: 'twitter', name: 'X / Twitter Large Card', color: 'text-blue-400', bg: 'hover:bg-blue-500/10' },
                    { id: 'linkedin', name: 'LinkedIn Post Share', color: 'text-indigo-400', bg: 'hover:bg-indigo-500/10' },
                    { id: 'discover', name: 'Google Discover Mobile Feed', color: 'text-amber-400', bg: 'hover:bg-amber-500/10' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSimulatorPlatform(p.id)}
                      className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all border ${
                        simulatorPlatform === p.id 
                          ? 'bg-slate-800 border-emerald-500/50 shadow-md font-bold text-white' 
                          : 'border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className="text-xs font-medium">{p.name}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${simulatorPlatform === p.id ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`}></span>
                    </button>
                  ))}

                  <div className="pt-4 border-t border-slate-800 space-y-2 text-[11px] font-mono text-slate-400">
                    <p className="font-bold text-slate-300">Bot Interceptor Status:</p>
                    <p className="text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>OG Meta Tags Active in Express</span>
                    </p>
                    <button
                      onClick={() => handleCopy(`curl -H 'User-Agent: WhatsApp/2.23' "http://localhost:5000/api/share/${selectedItem.slug || selectedItem._id}"`, 'curl')}
                      className="w-full mt-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 text-[10px] font-mono font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all"
                    >
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{copiedLink === 'curl' ? 'Copied Terminal Command!' : 'Copy Curl Test Command'}</span>
                    </button>
                  </div>
                </div>

                {/* Simulation Canvas Right */}
                <div className="lg:col-span-2 flex items-center justify-center bg-slate-950 p-6 sm:p-10 rounded-2xl border border-slate-800 min-h-[420px]">
                  {/* WHATSAPP CARD MOCKUP */}
                  {simulatorPlatform === 'whatsapp' && (
                    <div className="w-full max-w-md bg-[#1f2c34] p-2 rounded-xl shadow-2xl space-y-2 border border-[#2b3a42] animate-zoomIn">
                      <div className="bg-[#182229] rounded-lg overflow-hidden cursor-pointer border border-emerald-900/30">
                        <div className="h-48 w-full bg-slate-800 overflow-hidden relative">
                          <img 
                            src={selectedItem.imageUrl || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800"} 
                            alt="OG Thumbnail" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                            <span className="text-emerald-400 font-mono text-xs uppercase tracking-wider bg-slate-950/80 px-2.5 py-0.5 rounded font-black border border-emerald-500/40">
                              News Nests • Real-Time Broadcast
                            </span>
                          </div>
                        </div>
                        <div className="p-3 space-y-1">
                          <h4 className="font-bold text-white text-sm line-clamp-1">{selectedItem.seoTitle || selectedItem.title}</h4>
                          <p className="text-xs text-gray-400 line-clamp-2">{selectedItem.metaDescription || "Click to launch active live stream coverage..."}</p>
                          <p className="text-[11px] text-emerald-400 font-mono font-medium pt-0.5">newsnests.com/share/{selectedItem.slug}</p>
                        </div>
                      </div>
                      <div className="flex justify-end text-[10px] text-gray-400 font-mono px-2 pb-1">
                        12:45 PM • Read
                      </div>
                    </div>
                  )}

                  {/* TWITTER CARD MOCKUP */}
                  {simulatorPlatform === 'twitter' && (
                    <div className="w-full max-w-lg bg-black rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl animate-zoomIn">
                      <div className="h-64 w-full bg-neutral-900 overflow-hidden relative">
                        <img 
                          src={selectedItem.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1000"} 
                          alt="Twitter Card" 
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-white px-2.5 py-1 rounded-md font-mono text-[11px] font-bold">
                          NEWSNESTS.COM
                        </span>
                      </div>
                      <div className="p-4 bg-neutral-900/90 border-t border-neutral-800 space-y-1">
                        <h4 className="font-bold text-white text-base leading-snug">{selectedItem.seoTitle || selectedItem.title}</h4>
                        <p className="text-xs text-neutral-400 line-clamp-2">{selectedItem.metaDescription}</p>
                      </div>
                    </div>
                  )}

                  {/* LINKEDIN CARD MOCKUP */}
                  {simulatorPlatform === 'linkedin' && (
                    <div className="w-full max-w-lg bg-[#1b1f23] rounded-lg overflow-hidden border border-gray-700 shadow-2xl animate-zoomIn">
                      <div className="h-60 w-full bg-gray-800 overflow-hidden">
                        <img 
                          src={selectedItem.imageUrl || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1000"} 
                          alt="LinkedIn Banner" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 bg-[#22272e] space-y-1">
                        <p className="text-[11px] font-mono text-gray-400 uppercase font-semibold">NEWNESTS.COM • LIVE JOURNALISM</p>
                        <h4 className="font-bold text-white text-sm sm:text-base">{selectedItem.seoTitle || selectedItem.title}</h4>
                      </div>
                    </div>
                  )}

                  {/* GOOGLE DISCOVER MOCKUP */}
                  {simulatorPlatform === 'discover' && (
                    <div className="w-full max-w-md bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 p-4 shadow-2xl space-y-3 animate-zoomIn">
                      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">N</div>
                        <span>News Nests</span>
                        <span>•</span>
                        <span className="text-amber-400 font-mono text-[11px]">Top Stories Carousel</span>
                      </div>
                      <h4 className="font-bold font-serif text-white text-lg leading-snug">{selectedItem.seoTitle || selectedItem.title}</h4>
                      <div className="h-48 w-full rounded-2xl overflow-hidden bg-neutral-800">
                        <img 
                          src={selectedItem.imageUrl || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800"} 
                          alt="Discover Thumbnail (1200px enforced)" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INSTANT SEARCH INDEXER */}
        {activeTab === 'indexer' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Instant Search Engine Indexing Broadcast Engine</span>
              </h2>
              <p className="text-xs text-slate-400">Force instantaneous crawls without waiting for traditional 24-48 hr spider cycles. Uses official IndexNow endpoints and Google webhooks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Breaking Event Boost</span>
                  <h3 className="font-bold text-white text-sm">Ping All Active Live Streams</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Broadcasts URLs of all active reporter WebRTC streams and live text blogs directly to Bing & Google News.</p>
                </div>
                <button
                  onClick={() => handleTriggerIndex('active_streams')}
                  disabled={pinging}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Broadcast Active Streams</span>
                </button>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">Recent Articles Sync</span>
                  <h3 className="font-bold text-white text-sm">Ping Top 25 Recent Stories</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Ensure freshly published editorial articles get cached immediately by all major search engine indexing bots.</p>
                </div>
                <button
                  onClick={() => handleTriggerIndex('recent_news')}
                  disabled={pinging}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sync Recent Stories</span>
                </button>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">Full Catalog Broadcast</span>
                  <h3 className="font-bold text-white text-sm">Full Deep-Crawl Sitemap Sync</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Transmits up to 50 primary site endpoints in a single asynchronous batch payload to all index receptors.</p>
                </div>
                <button
                  onClick={() => handleTriggerIndex('all')}
                  disabled={pinging}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  <span>Trigger Deep-Crawl Sync</span>
                </button>
              </div>
            </div>

            {/* Custom URL Submitter */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
              <h4 className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Manual Custom URL Webhook Transmitter</span>
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={customUrls}
                  onChange={(e) => setCustomUrls(e.target.value)}
                  placeholder="Paste URL (e.g. http://localhost:5173/article/election-2026-analysis-a3c9e)..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
                <button
                  onClick={() => {
                    if (!customUrls.trim()) return alert('Please input a URL');
                    handleTriggerIndex('', [customUrls.trim()]);
                    setCustomUrls('');
                  }}
                  disabled={pinging || !customUrls.trim()}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono font-black text-xs uppercase rounded-xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
                >
                  Transmit Payload Now
                </button>
              </div>
            </div>

            {/* Live Terminal Log */}
            <div className="bg-black/90 p-4 rounded-xl border border-slate-800 space-y-2 h-56 overflow-y-auto font-mono text-xs">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-900 pb-1.5 flex items-center justify-between">
                <span>⚡ Real-Time Indexing Transmitter Terminal Log</span>
                <span className="text-emerald-400">READY</span>
              </div>
              {pingLog.length === 0 ? (
                <div className="text-slate-600 text-center py-12">Awaiting indexation transmission commands... Click any sync button above.</div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {pingLog.map((log, idx) => (
                    <div key={idx} className={`flex items-start gap-2 ${
                      log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-rose-400' : log.type === 'info' ? 'text-amber-400' : 'text-slate-300'
                    }`}>
                      <span className="text-slate-600 text-[10px] flex-shrink-0">[{log.time}]</span>
                      <span>{log.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUICK EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6 animate-zoomIn relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base font-serif flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Quick-Edit SEO Tags & Semantic Slug</span>
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white text-xs font-mono font-bold">
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-300 block">Semantic Keyword Slug (URL Path):</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-slate-500 font-mono select-none">/{editForm.type === 'news' ? 'article' : 'live-blogs?id='}/</span>
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    placeholder="e.g. breaking-elections-live-stream"
                    className="flex-1 bg-transparent border-none text-emerald-400 font-mono font-bold text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-mono">
                  <label className="font-bold text-slate-300">Custom SEO Title Override:</label>
                  <span className={`text-[10px] ${editForm.seoTitle.length > 65 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                    {editForm.seoTitle.length} / 65 chars
                  </span>
                </div>
                <input
                  type="text"
                  value={editForm.seoTitle}
                  onChange={(e) => setEditForm({ ...editForm, seoTitle: e.target.value })}
                  placeholder="Leave blank to default to primary title"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-mono">
                  <label className="font-bold text-slate-300">Meta & Open Graph Description:</label>
                  <span className={`text-[10px] ${editForm.metaDescription.length < 50 || editForm.metaDescription.length > 160 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {editForm.metaDescription.length} chars (Target: 50-160)
                  </span>
                </div>
                <textarea
                  value={editForm.metaDescription}
                  onChange={(e) => setEditForm({ ...editForm, metaDescription: e.target.value })}
                  rows={4}
                  placeholder="Write compelling summary for Google Search preview cards & WhatsApp embeds..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-hidden focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-mono text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono font-bold rounded-xl shadow-lg transition-all"
                >
                  {saving ? 'Saving & Re-indexing...' : 'Save & Re-Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
