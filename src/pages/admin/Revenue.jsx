import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, Activity, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';

const Revenue = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await api.get('/revenue');
        setStats(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch revenue statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading revenue data...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Revenue Dashboard</h2>
        <p className="text-muted-foreground mt-1">Track your subscription earnings and graphical insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-xl border border-border/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{formatCurrency(stats.totalRevenue)}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-muted-foreground">This Month</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{formatCurrency(stats.monthlyRevenue)}</h3>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Subscribers</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalSubscribers || 0}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalTransactions || 0}</h3>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Revenue Area Chart */}
        <div className="bg-white p-6 rounded-xl border border-border/50 shadow-sm md:col-span-2 flex flex-col h-[450px]">
          <h3 className="text-lg font-bold mb-4">Revenue Growth (July to June)</h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
                <RechartsTooltip 
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-border/50 shadow-sm flex flex-col h-[450px]">
          <h3 className="text-lg font-bold mb-4">Plan Distribution</h3>
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            {stats.planChartData && stats.planChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.planChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.planChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value, name) => [value + ' Subscribers', name]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground text-sm">
                No active subscriptions yet
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Transactions List */}
      <div className="bg-white p-6 rounded-xl border border-border/50 shadow-sm flex flex-col">
        <h3 className="text-lg font-bold mb-4">Recent Subscriptions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.map(tx => (
                  <tr key={tx._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{tx.user?.fullName || 'Unknown User'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-red-100">
                        {tx.planName || 'Subscription'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-green-600 text-right">+{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 text-right">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                    No recent transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Revenue;
