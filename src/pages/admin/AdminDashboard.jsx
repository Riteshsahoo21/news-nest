import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Users, FileText, Eye, TrendingUp, Tags, MessageSquare, CheckCircle } from 'lucide-react';
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
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;
  }

  if (!stats) {
    return <div className="p-8 text-center text-red-600">Failed to load dashboard data.</div>;
  }

  const statCards = [
    { title: 'Total Users', value: stats.totals.users.toLocaleString(), icon: Users, trend: `${stats.statisticsChange.monthlyUsersChange}% from last month`, color: 'text-blue-600' },
    { title: 'Total Articles', value: stats.totals.articles.toLocaleString(), icon: FileText, trend: `${stats.statisticsChange.weeklyArticlesChange}% from last week`, color: 'text-green-600' },
    { title: 'Total Views', value: stats.totals.views.toLocaleString(), icon: Eye, trend: `Platform wide`, color: 'text-purple-600' },
    { title: 'Categories', value: stats.totals.categories.toLocaleString(), icon: Tags, trend: 'Active categories', color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500 mt-2">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs mt-1 ${stat.trend.includes('-') ? 'text-red-500' : 'text-green-500'}`}>
                  {stat.trend.includes('-') ? stat.trend : `+${stat.trend}`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500">No recent activity found.</p>
              ) : (
                stats.recentActivity.map((item) => (
                  <div key={item._id} className="flex items-center gap-4 border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-gray-900 truncate">New article: {item.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString()} • {item.category}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button 
              onClick={() => navigate('/admin/users')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <span className="text-sm font-medium text-gray-700">Manage Users</span>
              <Users className="h-4 w-4 text-gray-500" />
            </button>
            <button 
              onClick={() => navigate('/admin/categories')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <span className="text-sm font-medium text-gray-700">Manage Categories</span>
              <Tags className="h-4 w-4 text-gray-500" />
            </button>
            <button 
              onClick={() => navigate('/admin/approvals')}
              className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
            >
              <span className="text-sm font-medium text-red-700">Review Pending Approvals</span>
              <CheckCircle className="h-4 w-4 text-red-600" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
