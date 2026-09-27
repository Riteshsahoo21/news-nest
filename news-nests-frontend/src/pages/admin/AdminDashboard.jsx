import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Users, FileText, Eye, TrendingUp, Tags, MessageSquare, CheckCircle, ArrowRight, BarChart3, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          <p className="text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl border border-red-100">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats.totals.users.toLocaleString(), icon: Users, trend: `${stats.statisticsChange.monthlyUsersChange}% from last month`, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Total Articles', value: stats.totals.articles.toLocaleString(), icon: FileText, trend: `${stats.statisticsChange.weeklyArticlesChange}% from last week`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Total Views', value: stats.totals.views.toLocaleString(), icon: Eye, trend: `Platform wide engagement`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Categories', value: stats.totals.categories.toLocaleString(), icon: Tags, trend: 'Active news categories', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-8 py-10 shadow-xl shadow-slate-900/10">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent"></div>
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Activity className="w-96 h-96" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Welcome back to your <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">Newsroom</span>
            </h2>
            <p className="text-slate-300 text-lg max-w-xl">
              Here's a snapshot of your platform's performance and recent editorial activity.
            </p>
          </div>
          <button 
            onClick={() => navigate('/admin/reports')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 border border-white/10 group"
          >
            <BarChart3 className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            View Full Analytics
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.trend.includes('+') || !stat.trend.includes('-');
          return (
            <Card key={index} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group bg-white overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity" style={{ color: stat.color.replace('text-', '') }}></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {stat.trend.includes('%') && (
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
                      {stat.trend.split(' ')[0]}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{stat.value}</h3>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Activity Timeline */}
        <Card className="lg:col-span-2 border-0 shadow-lg shadow-slate-200/50 bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900">Recent Editorial Activity</CardTitle>
              <button 
                onClick={() => navigate('/admin/content')}
                className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-medium">No recent activity detected.</div>
              ) : (
                stats.recentActivity.map((item, i) => (
                  <div key={item._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 group-hover:bg-red-50 group-hover:text-red-500 transition-colors z-10">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group-hover:border-red-100 relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase tracking-wider">{item.category}</span>
                        <time className="text-xs text-slate-400 font-medium">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mt-2 leading-snug">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {item.author || 'Newsroom'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Quick Actions Panel */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BarChart3 className="w-32 h-32 transform rotate-12" />
            </div>
            <CardContent className="p-8 relative z-10">
              <h3 className="text-xl font-bold mb-2">Deep Analytics</h3>
              <p className="text-slate-300 text-sm mb-6 max-w-[200px]">Dive deep into your readership metrics, traffic sources, and revenue reports.</p>
              <button 
                onClick={() => navigate('/admin/reports')}
                className="w-full bg-white text-slate-900 hover:bg-slate-100 py-3 rounded-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Activity className="w-5 h-5 text-red-500" />
                Launch Analytics
              </button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900">Workspace Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid gap-3">
              <button 
                onClick={() => navigate('/admin/approvals')}
                className="w-full group flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 rounded-xl transition-colors border border-red-100"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold text-slate-900">Editorial Approvals</span>
                    <span className="block text-xs text-slate-500 font-medium">Review pending articles</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
              
              <button 
                onClick={() => navigate('/admin/users')}
                className="w-full group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold text-slate-900">Manage Team</span>
                    <span className="block text-xs text-slate-500 font-medium">Editors, reporters & users</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </button>

              <button 
                onClick={() => navigate('/admin/categories')}
                className="w-full group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <Tags className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold text-slate-900">News Categories</span>
                    <span className="block text-xs text-slate-500 font-medium">Configure topics & tags</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
