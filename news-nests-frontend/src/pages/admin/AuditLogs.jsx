import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { 
  Search, Download, RefreshCw, X, ShieldAlert, CheckCircle2, 
  AlertTriangle, Info, Clock, MapPin, Monitor, Key, FileJson, 
  ChevronLeft, ChevronRight, Activity, Layers, FileText, Users, 
  DollarSign, MessageSquare, Settings, Globe, Smartphone, Laptop, 
  Sparkles, Database, ShieldCheck, Filter, ArrowUpRight, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, successful: 0, failed: 0, critical: 0, todayCount: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [moduleCategory, setModuleCategory] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Drawer state
  const [selectedLog, setSelectedLog] = useState(null);
  const autoRefreshIntervalRef = useRef(null);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [page, moduleCategory, timeRange, severity, status]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchStats();
        fetchLogs();
      }, 10000);
    } else {
      clearInterval(autoRefreshIntervalRef.current);
    }
    return () => clearInterval(autoRefreshIntervalRef.current);
  }, [autoRefresh, page, moduleCategory, timeRange, severity, status, search]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/audit-logs/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: 15,
        ...(search && { search }),
        ...(moduleCategory !== 'all' && { moduleCategory }),
        ...(timeRange !== 'all' && { timeRange }),
        ...(severity !== 'all' && { severity }),
        ...(status !== 'all' && { status }),
      });

      const response = await api.get(`/admin/audit-logs?${queryParams}`);
      if (response.data.success) {
        setLogs(response.data.data);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setError('Failed to fetch logs');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Fallback formatters for existing logs without new schema fields
  const getLogModule = (log) => {
    if (log.moduleCategory && log.moduleCategory !== 'General') return log.moduleCategory;
    const ep = log.endpoint || '';
    if (ep.includes('/news') || ep.includes('/live-blogs') || ep.includes('/photo-galleries') || ep.includes('/categories')) return 'Content';
    if (ep.includes('/auth')) return 'Authentication';
    if (ep.includes('/users') || ep.includes('/roles') || ep.includes('/reporter-applications')) return 'Users & Access';
    if (ep.includes('/subscriptions') || ep.includes('/payment') || ep.includes('/stripe') || ep.includes('/ads')) return 'Monetization';
    if (ep.includes('/comments') || ep.includes('/newsletter')) return 'Community';
    if (ep.includes('/settings')) return 'System';
    return 'General';
  };

  const getLogTarget = (log) => {
    if (log.targetEntity && log.targetEntity.entityName) {
      return `${log.targetEntity.entityType ? log.targetEntity.entityType + ': ' : ''}${log.targetEntity.entityName}`;
    }
    const details = log.details || {};
    const name = details.title || details.name || details.fullName || details.email || details.subject || null;
    if (name) return `Target: ${name}`;
    if (details.id || details._id) return `ID: ${String(details.id || details._id).slice(-8)}`;
    return null;
  };

  const getLogDevice = (log) => {
    if (log.deviceInfo && log.deviceInfo.browser && log.deviceInfo.browser !== 'Unknown') {
      return `${log.deviceInfo.browser} (${log.deviceInfo.os || 'OS'})`;
    }
    const ua = log.userAgent || '';
    if (ua.includes('Chrome')) return 'Chrome Browser';
    if (ua.includes('Safari')) return 'Safari Browser';
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Postman') || ua.includes('curl')) return 'API Tool';
    return 'Web Device';
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      'Timestamp', 'Module', 'Action', 'Target Resource', 'User Name', 
      'User Email', 'IP Address', 'Location', 'Device / OS', 'Status Code', 'Severity', 'Response Time (ms)'
    ];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => {
        const mod = getLogModule(log);
        const target = getLogTarget(log) || log.endpoint;
        const device = getLogDevice(log);
        return [
          `"${new Date(log.createdAt).toISOString()}"`,
          `"${mod}"`,
          `"${log.readableAction || log.action}"`,
          `"${String(target).replace(/"/g, '""')}"`,
          `"${log.userId ? log.userId.fullName || 'User' : 'System / Guest'}"`,
          `"${log.userId ? log.userId.email : 'N/A'}"`,
          `"${log.ipAddress || ''}"`,
          `"${log.location || 'Not Available'}"`,
          `"${device}"`,
          `"${log.status}"`,
          `"${log.severity}"`,
          `"${log.responseTime || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `news_nests_audit_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (sev, status) => {
    if (status >= 400 || sev === 'critical') {
      return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 flex items-center gap-1 w-fit"><ShieldAlert className="w-3.5 h-3.5 text-red-500"/> Action Required</span>;
    }
    if (sev === 'warning') {
      return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit"><AlertTriangle className="w-3.5 h-3.5 text-amber-500"/> Warning</span>;
    }
    return <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> Success</span>;
  };

  // Status badge removed to merge with severity

  const getModuleBadge = (mod) => {
    switch (mod) {
      case 'Content':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1 w-fit"><FileText className="w-3 h-3 text-purple-500"/> Content</span>;
      case 'Authentication':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1 w-fit"><Key className="w-3 h-3 text-amber-500"/> Auth</span>;
      case 'Users & Access':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1 w-fit"><Users className="w-3 h-3 text-blue-500"/> Access</span>;
      case 'Monetization':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1 w-fit"><DollarSign className="w-3 h-3 text-emerald-500"/> Revenue</span>;
      case 'Community':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-500/20 flex items-center gap-1 w-fit"><MessageSquare className="w-3 h-3 text-pink-500"/> Community</span>;
      case 'System':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 flex items-center gap-1 w-fit"><Settings className="w-3 h-3 text-slate-400"/> System</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 flex items-center gap-1 w-fit"><Layers className="w-3 h-3"/> General</span>;
    }
  };

  // Helper to format payload changes cleanly
  const renderFormattedDetails = (details) => {
    if (!details || Object.keys(details).length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
          <Info className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="font-medium">No payload attributes recorded</p>
          <p className="text-xs">This request did not carry extra body parameters or query variables.</p>
        </div>
      );
    }

    // Filter out internal noisy fields
    const ignoredFields = ['__v', 'password', 'confirmPassword', 'token', 'idToken', 'captchaToken'];
    const entries = Object.entries(details).filter(([key, val]) => !ignoredFields.includes(key) && val !== undefined && val !== null);

    return (
      <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b uppercase font-semibold text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 w-1/3">Field Name</th>
              <th className="px-4 py-2.5">Recorded Value</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map(([key, val], idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono font-medium text-foreground bg-muted/10">
                  {key}
                </td>
                <td className="px-4 py-3 font-mono break-all text-muted-foreground">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-[1650px] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Audit & Security Logs</h1>
              <p className="text-sm text-muted-foreground">Real-time newsroom compliance, access control, and content governance monitoring.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm ${autoRefresh ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 animate-pulse' : 'bg-background border hover:bg-muted text-foreground'}`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live Sync Active (10s)' : 'Enable Live Sync'}
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-background border hover:bg-muted text-foreground shadow-sm transition-all"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            Export Audit Report
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="space-y-6">
        {/* Growth & Revenue */}
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500"/> Growth & Revenue</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">New Registrations</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.metrics?.newRegistrations || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Premium Upgrades</CardTitle>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.metrics?.subscriptionUpgrades || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Successful Payments</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.metrics?.paymentSuccess || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Failed Transactions</CardTitle>
                <ShieldAlert className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-extrabold tracking-tight ${stats.metrics?.paymentFailed > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                  {stats.metrics?.paymentFailed || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content & Community */}
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-purple-500"/> Content & Community</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Published Content</CardTitle>
                <FileText className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.metrics?.contentPublished || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Deleted Content</CardTitle>
                <Trash2 className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.metrics?.contentDeleted || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Comments Moderated</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.metrics?.commentsModerated || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Security & Access */}
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500"/> Security & Access</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Successful Logins</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.metrics?.successfulLogins || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Failed Logins</CardTitle>
                <ShieldAlert className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-extrabold tracking-tight ${stats.metrics?.failedLogins > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                  {stats.metrics?.failedLogins || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Role & Permission Changes</CardTitle>
                <Key className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.metrics?.roleChanges || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Security Anomalies</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-extrabold tracking-tight ${stats.metrics?.securityAlerts > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                  {stats.metrics?.securityAlerts || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Module Filter Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b text-sm">
        {[
          { id: 'all', label: 'All Domains', icon: Layers },
          { id: 'Content', label: 'Editorial Content', icon: FileText },
          { id: 'Users & Access', label: 'Users & Roles', icon: Users },
          { id: 'Authentication', label: 'Logins & Security', icon: Key },
          { id: 'Monetization', label: 'Payments & Subscriptions', icon: DollarSign },
          { id: 'Community', label: 'Community & Comments', icon: MessageSquare },
          { id: 'System', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = moduleCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setModuleCategory(tab.id); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap border-b-2 transition-all ${active ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              {tab.label}
              {tab.id !== 'all' && stats.byCategory && stats.byCategory[tab.id] > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-muted text-foreground rounded-full font-mono">
                  {stats.byCategory[tab.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Table Card */}
      <Card className="border-border/60 shadow-md bg-background overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 min-w-[280px]">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search action name, target title, user or IP..."
                className="w-full pl-9 pr-4 py-2 text-xs font-medium border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground bg-background border rounded-lg shadow-sm">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <select 
                className="bg-transparent border-none focus:outline-none cursor-pointer text-foreground font-medium"
                value={timeRange}
                onChange={(e) => { setTimeRange(e.target.value); setPage(1); }}
              >
                <option value="all">All Time History</option>
                <option value="today">Today (Since Midnight)</option>
                <option value="last24h">Past 24 Hours</option>
                <option value="last7d">Past 7 Days</option>
                <option value="last30d">Past 30 Days</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground bg-background border rounded-lg shadow-sm">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <select 
                className="bg-transparent border-none focus:outline-none cursor-pointer text-foreground font-medium"
                value={severity}
                onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              >
                <option value="all">Any Severity</option>
                <option value="info">Info (Normal)</option>
                <option value="warning">Warning (4xx)</option>
                <option value="critical">Critical (5xx)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground bg-background border rounded-lg shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <select 
                className="bg-transparent border-none focus:outline-none cursor-pointer text-foreground font-medium"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="all">Any Status</option>
                <option value="success">Successful Only</option>
                <option value="error">Failed / Error Only</option>
              </select>
            </div>

            {(search || moduleCategory !== 'all' || timeRange !== 'all' || severity !== 'all' || status !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setModuleCategory('all');
                  setTimeRange('all');
                  setSeverity('all');
                  setStatus('all');
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto relative min-h-[420px]">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-bold text-muted-foreground uppercase bg-muted/60 border-b sticky top-0 z-10 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Domain</th>
                <th className="px-6 py-3.5">Action & Target Resource</th>
                <th className="px-6 py-3.5">Performed By</th>
                <th className="px-6 py-3.5">Origin & Device</th>
                <th className="px-6 py-3.5">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-28"></div></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-48 mb-1"></div><div className="h-3 bg-muted rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-7 h-7 bg-muted rounded-full"></div><div className="h-4 bg-muted rounded w-28"></div></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24 mb-1"></div><div className="h-3 bg-muted rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-16"></div></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-red-500 font-medium">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-rose-500" />
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-4 rounded-full bg-muted/50 mb-3 border">
                        <ShieldCheck className="h-10 w-10 text-muted-foreground/60" />
                      </div>
                      <p className="text-base font-bold text-foreground">No audit log records found</p>
                      <p className="text-xs max-w-sm mt-1">We couldn't find any activities matching your active filters. Try resetting the time range or search keyword.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const moduleName = getLogModule(log);
                  const targetLabel = getLogTarget(log);
                  const deviceLabel = getLogDevice(log);

                  return (
                    <tr 
                      key={log._id} 
                      className="hover:bg-muted/40 cursor-pointer transition-all duration-150 group"
                      onClick={() => { setSelectedLog(log); setDrawerTab('summary'); }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-muted-foreground ml-5">
                          {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getModuleBadge(moduleName)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5 group-hover:text-primary transition-colors">
                          {log.readableAction || 'System Request'}
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </div>
                        {targetLabel ? (
                          <div className="text-xs font-medium text-muted-foreground mt-0.5 bg-muted/50 px-2 py-0.5 rounded border border-border/50 inline-block max-w-xs truncate">
                            {targetLabel}
                          </div>
                        ) : (
                          <div className="text-[11px] font-mono text-muted-foreground mt-0.5 flex items-center gap-1">
                            <span className="font-bold text-primary">{log.method}</span> {log.endpoint?.split('?')[0]}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.userId ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 text-primary flex items-center justify-center text-xs font-extrabold border border-primary/20 shadow-xs">
                              {log.userId.fullName ? log.userId.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-foreground">{log.userId.fullName || 'Authorized User'}</div>
                              <div className="text-[11px] text-muted-foreground">{log.userId.email}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold border">
                              SYS
                            </div>
                            <span className="text-xs font-medium text-muted-foreground italic">Unauthenticated / System</span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{log.location || 'Local / Intranet'}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          {deviceLabel.includes('Mobile') || deviceLabel.includes('iPhone') ? (
                            <Smartphone className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <Laptop className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span>{deviceLabel}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSeverityBadge(log.severity, log.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-muted/20 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium">
          <div className="text-muted-foreground">
            Displaying page <span className="font-bold text-foreground">{page}</span> of <span className="font-bold text-foreground">{totalPages || 1}</span> 
            <span className="ml-2 px-2 py-0.5 bg-background rounded border font-mono text-[11px]">
              Total Records: {stats.total ? stats.total.toLocaleString() : '0'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-lg bg-background hover:bg-muted font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading || totalPages === 0}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-lg bg-background hover:bg-muted font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Side Drawer for Details */}
      <AnimatePresence>
        {selectedLog && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs"
              onClick={() => setSelectedLog(null)}
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-2xl bg-background border-l shadow-2xl z-50 overflow-y-auto flex flex-col"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b sticky top-0 bg-background/95 backdrop-blur z-20 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getModuleBadge(getLogModule(selectedLog))}
                    {getSeverityBadge(selectedLog.severity, selectedLog.status)}
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight mt-1 text-foreground">
                    {selectedLog.readableAction || 'System Request Details'}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono flex items-center gap-2 mt-1">
                    <span>ID: {selectedLog._id}</span> • 
                    <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* Target & Execution Summary Card */}
                <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-primary" /> Action & Target Overview
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-background p-3 rounded-lg border">
                      <p className="text-muted-foreground text-[11px] uppercase font-semibold">Target Entity / Resource</p>
                      <p className="font-bold text-sm text-foreground mt-0.5">
                        {getLogTarget(selectedLog) || 'General Endpoint Activity'}
                      </p>
                    </div>
                    <div className="bg-background p-3 rounded-lg border">
                      <p className="text-muted-foreground text-[11px] uppercase font-semibold">Response Performance</p>
                      <p className="font-bold text-sm text-foreground mt-0.5 font-mono">
                        {selectedLog.responseTime ? `${selectedLog.responseTime} ms` : 'Instant'}
                      </p>
                    </div>
                  </div>
                  <div className="font-mono text-xs bg-background p-2.5 rounded-lg border flex items-center gap-2">
                    <span className="break-all font-medium text-foreground">{selectedLog.readableAction || 'System Request'}</span>
                  </div>
                </div>

                {/* Performer & Authentication */}
                <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" /> Performer Authentication
                  </h3>
                  {selectedLog.userId ? (
                    <div className="flex items-center gap-3 bg-background p-3.5 rounded-lg border">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 text-primary flex items-center justify-center font-extrabold text-lg border border-primary/20 shadow-xs">
                        {selectedLog.userId.fullName ? selectedLog.userId.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{selectedLog.userId.fullName || 'Authorized Staff Member'}</p>
                        <p className="text-xs text-muted-foreground">{selectedLog.userId.email}</p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Account ID: {selectedLog.userId._id}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-background p-3.5 rounded-lg border text-xs text-muted-foreground italic flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-500 shrink-0" />
                      This action was executed without user authentication tokens (e.g., public login attempt, background webhook, or anonymous interaction).
                    </div>
                  )}
                  {selectedLog.sessionId && (
                    <div className="flex items-center justify-between text-[11px] px-1 text-muted-foreground font-mono">
                      <span>Session Fingerprint:</span>
                      <span className="bg-background px-2 py-0.5 rounded border">{selectedLog.sessionId}</span>
                    </div>
                  )}
                </div>

                {/* Network Origin & Client Device */}
                <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-primary" /> Origin & Device Fingerprint
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-background p-3 rounded-lg border">
                      <p className="text-muted-foreground text-[11px] mb-1">IP Address & Location</p>
                      <p className="font-mono font-bold text-foreground">{selectedLog.ipAddress}</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" /> {selectedLog.location || 'Local Dev / Intranet'}
                      </p>
                    </div>
                    <div className="bg-background p-3 rounded-lg border">
                      <p className="text-muted-foreground text-[11px] mb-1">Parsed Client Device</p>
                      <p className="font-bold text-foreground">{getLogDevice(selectedLog)}</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {selectedLog.deviceInfo?.deviceType || 'Standard Desktop / Web Client'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-background p-2.5 rounded-lg border text-[11px]">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold block mb-1">Parsed User-Agent:</span>
                    <p className="font-mono text-muted-foreground break-all">{getLogDevice(selectedLog)}</p>
                  </div>
                </div>

                {/* Payload & Submitted Data Inspection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileJson className="w-4 h-4 text-primary" /> Request Payload & Modifications
                    </h3>
                    
                    {/* Tabs Switcher removed */}
                  </div>

                  {renderFormattedDetails(selectedLog.details)}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
