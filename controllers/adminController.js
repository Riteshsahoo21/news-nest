import User from '../models/User.js';
import News from '../models/News.js';
import Comment from '../models/Comment.js';
import AuditLog from '../models/AuditLog.js';

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Basic Counts
    const totalUsers = await User.countDocuments();
    const totalArticles = await News.countDocuments();
    const totalComments = await Comment.countDocuments();
    
    const categories = await News.distinct('category');
    const totalCategories = categories.length;

    // Total Views
    const viewsAggregation = await News.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const totalViews = viewsAggregation.length > 0 ? viewsAggregation[0].totalViews : 0;

    // Today's Published Articles
    const todayPublished = await News.countDocuments({
      createdAt: { $gte: today }
    });

    // Trending Articles
    const trendingArticles = await News.find({ isTrending: true })
      .select('title category views createdAt')
      .sort({ views: -1, createdAt: -1 })
      .limit(5);

    // Recent Activity (Latest 5 articles)
    const recentActivity = await News.find()
      .select('title author category createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Weekly stats change (Articles)
    const thisWeekArticles = await News.countDocuments({ createdAt: { $gte: startOfWeek } });
    const lastWeekArticles = await News.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfWeek } });
    
    let weeklyArticlesChange = 0;
    if (lastWeekArticles > 0) {
      weeklyArticlesChange = ((thisWeekArticles - lastWeekArticles) / lastWeekArticles) * 100;
    } else if (thisWeekArticles > 0) {
      weeklyArticlesChange = 100;
    }

    // Monthly stats change (Users)
    const thisMonthUsers = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
    const lastMonthUsers = await User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } });
    
    let monthlyUsersChange = 0;
    if (lastMonthUsers > 0) {
      monthlyUsersChange = ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100;
    } else if (thisMonthUsers > 0) {
      monthlyUsersChange = 100;
    }

    res.status(200).json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          articles: totalArticles,
          categories: totalCategories,
          comments: totalComments,
          views: totalViews,
          todayPublished,
        },
        trendingArticles,
        recentActivity,
        statisticsChange: {
          weeklyArticlesChange: weeklyArticlesChange.toFixed(2),
          monthlyUsersChange: monthlyUsersChange.toFixed(2),
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const getAuditLogStats = async (req, res) => {
  try {
    const total = await AuditLog.countDocuments();
    const successful = await AuditLog.countDocuments({ status: { $lt: 400 } });
    const failed = await AuditLog.countDocuments({ status: { $gte: 400, $lt: 500 } });
    const critical = await AuditLog.countDocuments({ severity: 'critical' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await AuditLog.countDocuments({ createdAt: { $gte: today } });

    const categoryAggregation = await AuditLog.aggregate([
      { $group: { _id: '$moduleCategory', count: { $sum: 1 } } }
    ]);
    const byCategory = {};
    categoryAggregation.forEach(item => {
      byCategory[item._id || 'General'] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        successful,
        failed,
        critical,
        todayCount,
        byCategory
      }
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, severity, status, action, moduleCategory, timeRange } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query object
    let query = {};

    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { readableAction: { $regex: search, $options: 'i' } },
        { endpoint: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
        { 'targetEntity.entityName': { $regex: search, $options: 'i' } }
      ];
    }

    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    if (action && action !== 'all') {
      query.action = { $regex: action, $options: 'i' };
    }

    if (moduleCategory && moduleCategory !== 'all') {
      query.moduleCategory = moduleCategory;
    }

    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let fromDate;
      if (timeRange === 'today') {
        fromDate = new Date(now);
        fromDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'last24h') {
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (timeRange === 'last7d') {
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'last30d') {
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (fromDate) {
        query.createdAt = { $gte: fromDate };
      }
    }

    if (status && status !== 'all') {
      if (status === 'success') query.status = { $lt: 400 };
      if (status === 'error') query.status = { $gte: 400 };
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await AuditLog.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({ 
      success: true, 
      count: logs.length,
      total,
      totalPages,
      currentPage: parseInt(page),
      data: logs 
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
