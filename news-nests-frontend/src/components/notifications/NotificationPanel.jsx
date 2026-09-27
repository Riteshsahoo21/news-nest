import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, Gem, Activity, Settings, Bell } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const NOTIFICATION_CONFIG = {
  breaking_news: {
    icon: Zap,
    colorClass: 'text-red-500',
    bgClass: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-100',
  },
  subscription_alert: {
    icon: Gem,
    colorClass: 'text-yellow-600',
    bgClass: 'bg-yellow-50 border-yellow-200',
    iconBg: 'bg-yellow-100',
  },
  sports_update: {
    icon: Activity,
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100',
  },
  system_notice: {
    icon: Settings,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
  },
  general: {
    icon: Bell,
    colorClass: 'text-gray-500',
    bgClass: 'bg-gray-50 border-gray-200',
    iconBg: 'bg-gray-100',
  },
};

export default function NotificationPanel({ isOpen, onClose }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchNotifications();
    }
  }, [isOpen, isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark read:', error);
      }
    }

    if (notification.link) {
      onClose();
      if (notification.link.startsWith('http')) {
        window.open(notification.link, '_blank');
      } else {
        navigate(notification.link);
      }
    }
  };

  const getTimeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return `${seconds} secs ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  if (!isAuthenticated) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for Desktop to click-outside-to-close */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 md:block hidden"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full md:w-[450px] bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                  <ArrowLeft className="w-6 h-6 text-gray-800" />
                </button>
                <h2 className="text-xl font-bold ml-2">Notifications</h2>
              </div>
              <button 
                onClick={handleMarkAllRead}
                className="text-red-500 font-medium text-sm hover:text-red-600 transition-colors"
              >
                Mark All Read
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <Bell className="w-12 h-12 mb-2 opacity-20" />
                  <p>No notifications right now.</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.general;
                  const Icon = config.icon;

                  return (
                    <div 
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`relative p-4 rounded-[1.25rem] border ${config.bgClass} cursor-pointer transition-transform active:scale-[0.98] ${notification.isRead ? 'opacity-70' : 'opacity-100'}`}
                    >
                      <div className="flex gap-4">
                        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.iconBg}`}>
                          <Icon className={`w-5 h-5 ${config.colorClass}`} />
                        </div>
                        <div className="flex-1 pt-1">
                          <h3 className="font-bold text-gray-900 text-[15px] mb-1.5 pr-6">
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 text-sm leading-relaxed mb-3">
                            {notification.message}
                          </p>
                          <span className="text-xs text-gray-400 font-medium">
                            {getTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-red-500"></div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
