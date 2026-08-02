import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, Clock, MousePointerClick, TrendingUp, Laptop, Smartphone, 
  MapPin, Globe, Activity, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// --- Mock Data ---
const visitorData = [
  { date: 'Mon', visitors: 4200, pageviews: 8400 },
  { date: 'Tue', visitors: 5800, pageviews: 11200 },
  { date: 'Wed', visitors: 6100, pageviews: 13500 },
  { date: 'Thu', visitors: 5200, pageviews: 9800 },
  { date: 'Fri', visitors: 7800, pageviews: 16400 },
  { date: 'Sat', visitors: 9200, pageviews: 21000 },
  { date: 'Sun', visitors: 8500, pageviews: 18500 },
];

const deviceData = [
  { name: 'Mobile', value: 65, color: '#3b82f6' },
  { name: 'Desktop', value: 25, color: '#10b981' },
  { name: 'Tablet', value: 10, color: '#8b5cf6' },
];

const locationData = [
  { country: 'United States', users: 24500 },
  { country: 'United Kingdom', users: 12300 },
  { country: 'Canada', users: 8400 },
  { country: 'Australia', users: 5200 },
  { country: 'Germany', users: 3100 },
];

const popularArticles = [
  { id: 1, title: 'The Future of Quantum Computing in 2026', views: 124500, category: 'Technology', trend: 'up' },
  { id: 2, title: 'Global Climate Summit Reaches Historic Agreement', views: 98200, category: 'World', trend: 'up' },
  { id: 3, title: 'New Electric Vehicle Breaks Range Records', views: 76400, category: 'Auto', trend: 'down' },
  { id: 4, title: 'Market Analysis: Tech Stocks Rally', views: 65100, category: 'Finance', trend: 'up' },
  { id: 5, title: 'Top 10 Travel Destinations for the Summer', views: 54300, category: 'Lifestyle', trend: 'up' },
];

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

const Reports = () => {
  const [dateRange, setDateRange] = useState('7D');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of your platform's traffic and user engagement.
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg">
          {['24H', '7D', '30D', '1Y'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                dateRange === range 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-background to-blue-50/10 dark:to-blue-900/10 relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Visitors</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-emerald-500 flex items-center mr-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Live
              </span>
              Right now
            </p>
          </CardContent>
          <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="h-16 w-16" />
          </div>
        </Card>

        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">46,800</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-emerald-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +12.5%
              </span>
              vs last {dateRange}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2m 45s</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-emerald-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +3.2%
              </span>
              vs last {dateRange}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bounce Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">42.3%</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-red-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +1.1%
              </span>
              vs last {dateRange}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Traffic Chart */}
        <Card className="col-span-1 lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Traffic Overview</CardTitle>
            <CardDescription>Visitors and Pageviews over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitorData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area 
                    type="monotone" 
                    dataKey="pageviews" 
                    name="Page Views"
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPageviews)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="visitors" 
                    name="Unique Visitors"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorVisitors)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Devices Donut Chart */}
        <Card className="col-span-1 border-border/50 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Sessions by Device</CardTitle>
            <CardDescription>Where your readers are coming from</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Smartphone className="h-8 w-8 text-muted-foreground mb-1" />
                <span className="text-2xl font-bold">{deviceData[0].value}%</span>
              </div>
            </div>
            
            {/* Custom Legend */}
            <div className="w-full mt-4 flex justify-center gap-6">
              {deviceData.map((device, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }}></div>
                  <span className="text-sm font-medium text-muted-foreground">{device.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Data Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Popular Articles */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Popular Articles</CardTitle>
            <CardDescription>Top performing content this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularArticles.map((article, i) => (
                <div key={article.id} className="flex items-center justify-between group p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {article.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{article.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{article.views.toLocaleString()}</div>
                    <div className={`text-xs flex items-center justify-end mt-0.5 ${article.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {article.trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                      Views
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Location Data */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>Traffic sources by location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis dataKey="country" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 500 }} width={100} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))', opacity: 0.4}}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="users" name="Active Users" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {locationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Reports;
