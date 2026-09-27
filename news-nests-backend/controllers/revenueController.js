import Invoice from '../models/Invoice.js';

export const getRevenueStats = async (req, res) => {
  try {
    const invoices = await Invoice.find({ status: 'paid' }).populate('user', 'fullName email').sort({ createdAt: -1 });
    
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Chart Data Arrays (Starting from July of the current year for 12 months)
    const monthlyDataMap = {};
    const startMonth = 6; // July is index 6
    const startYear = currentMonth < 6 ? currentYear - 1 : currentYear; 
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(startYear, startMonth + i, 1);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      monthlyDataMap[key] = 0;
    }
    
    const planDistribution = {};
    const uniqueSubscribers = new Set();
    let totalTransactions = invoices.length;

    invoices.forEach(invoice => {
      totalRevenue += invoice.amount;
      
      if (invoice.user) {
        const userId = invoice.user._id ? invoice.user._id.toString() : invoice.user.toString();
        uniqueSubscribers.add(userId);
      }
      
      const invDate = new Date(invoice.createdAt);
      if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
        monthlyRevenue += invoice.amount;
      }

      // Populate chart data
      const chartKey = `${invDate.toLocaleString('default', { month: 'short' })} ${invDate.getFullYear()}`;
      if (monthlyDataMap[chartKey] !== undefined) {
        monthlyDataMap[chartKey] += invoice.amount;
      }
      
      // Plan distribution
      const planName = invoice.planName || 'Unknown Plan';
      if (!planDistribution[planName]) {
        planDistribution[planName] = 0;
      }
      planDistribution[planName]++;
    });

    const planChartData = Object.keys(planDistribution).map(key => ({
      name: key,
      value: planDistribution[key]
    }));

    const revenueChartData = Object.keys(monthlyDataMap).map(key => ({
      name: key,
      revenue: monthlyDataMap[key]
    }));

    res.json({
      totalRevenue,
      monthlyRevenue,
      totalSubscribers: uniqueSubscribers.size,
      totalTransactions,
      revenueChartData,
      planChartData,
      recentTransactions: invoices.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    res.status(500).json({ error: 'Failed to fetch revenue statistics' });
  }
};
