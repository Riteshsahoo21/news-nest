import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, LogOut, PlusCircle, Moon, Sun, Bookmark, Star } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from './notifications/NotificationPanel';
import api from '../services/api';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, isNotificationOpen]);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications');
      const count = res.data.filter(n => !n.isRead).length;
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <nav className="bg-white dark:bg-[#0f172a] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 shadow-sm transition-colors">
        {/* Top Row: Logo, Search, Icons */}
        <div className="max-w-[1640px] mx-auto px-3 sm:px-6 md:px-10 xl:px-12 h-16 flex items-center justify-between w-full">
          
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 space-x-1.5 sm:space-x-2">
            {/* Custom SVG Logo matching the uploaded image */}
            <svg className="w-9 sm:w-[46px] h-auto" viewBox="0 0 60 55" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="55" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#003399"/>
                  <stop offset="1" stopColor="#001a4d"/>
                </linearGradient>
                <linearGradient id="lightBlueGradient" x1="0" y1="0" x2="30" y2="55" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4d94ff"/>
                  <stop offset="1" stopColor="#0047b3"/>
                </linearGradient>
              </defs>
              
              {/* Left Stem of N */}
              <path d="M5 15 L20 15 L35 45 L15 52 Z" fill="url(#blueGradient)"/>
              
              {/* Right curved stem of N (newspaper roll) */}
              <path d="M18 15 Q30 5 45 15 L45 45 Q30 35 15 52 Z" fill="url(#lightBlueGradient)"/>
              
              {/* White lines in the newspaper roll */}
              <path d="M22 20 Q32 15 42 22" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M25 25 Q35 20 42 27" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M28 30 Q36 26 42 32" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M29 35 Q37 31 42 37" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M27 40 Q35 36 42 42" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M23 45 Q31 41 38 46" stroke="white" strokeWidth="2" fill="none"/>

              {/* Red Radio Waves */}
              <path d="M28 10 A15 15 0 0 1 45 0" stroke="#ff0000" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M30 14 A10 10 0 0 1 40 5" stroke="#ff0000" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M33 17 A5 5 0 0 1 37 11" stroke="#ff0000" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </svg>
            <div className="flex flex-col justify-center">
              <span className="text-xl sm:text-[28px] font-black leading-none tracking-tight font-sans">
                <span className="text-[#002169] dark:text-blue-400">News</span><span className="text-[#e60000]">Nest</span>
              </span>
              <span className="hidden sm:block text-[10px] text-gray-700 dark:text-gray-300 font-medium tracking-wide mt-1 leading-none">
                Your Daily News, Smartly Sorted
              </span>
            </div>
          </Link>
          
          {/* Centered Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="search" 
                placeholder="Search news & live updates..." 
                className="w-full h-10 pl-11 pr-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 placeholder:text-gray-400 dark:text-gray-100 transition-shadow" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-3 md:space-x-4 shrink-0">
            
            {/* Mobile Search Icon */}
            <button onClick={() => navigate('/search')} className="md:hidden p-2 text-gray-600 dark:text-gray-300">
              <Search className="w-5 h-5" />
            </button>

            {/* Moon / Sun (Dark Mode Toggle) */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Bookmark */}
            <button 
              onClick={() => isAuthenticated ? navigate('/profile') : navigate('/login')}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hidden md:block rounded-full border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors"
              title="Saved Articles"
            >
              <Bookmark className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <button 
              onClick={() => isAuthenticated ? setIsNotificationOpen(true) : navigate('/login')} 
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white relative rounded-full border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {isAuthenticated && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#dc2626] text-[9px] font-bold text-white border-2 border-white dark:border-gray-800">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Auth Button */}
            {isAuthenticated ? (
              <div className="flex items-center pl-2 md:pl-4">
                <Link to="/profile" className="relative group flex items-center justify-center">
                  <div className={`relative flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300 ${
                    user?.isPremium 
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 shadow-[0_0_10px_rgba(250,204,21,0.3)] group-hover:shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                    {user?.isPremium ? (
                      <User className="w-4 h-4 text-yellow-700 dark:text-yellow-500" />
                    ) : (
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  
                  {/* Premium Badge Overlap */}
                  {user?.isPremium && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full p-[2px] shadow-sm border border-white dark:border-[#0f172a] z-10">
                      <Star className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  )}
                  
                  {/* Upgrade Tooltip for Free Users (Hover only, zero space taken) */}
                  {!user?.isPremium && (
                    <div className="absolute top-11 right-0 w-32 p-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-center pointer-events-none transform translate-y-1 group-hover:translate-y-0">
                      Upgrade to Premium
                    </div>
                  )}
                </Link>
              </div>
            ) : (
              <Link to="/login" className="pl-2">
                <Button className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-9 px-4 rounded-lg shadow-sm">
                  <User className="w-4 h-4 mr-2 hidden md:block" />
                  <span className="text-sm font-medium">Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Row: Navigation Links */}
        <div className="hidden md:flex justify-center border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] transition-colors">
          <div className="flex items-center space-x-8 text-[15px] font-medium h-12">
            <Link 
              to="/" 
              className={`flex items-center h-full border-b-2 px-1 transition-colors ${
                isActive('/') ? 'border-[#dc2626] text-[#dc2626]' : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Home Feed
            </Link>
            
            <Link 
              to="/live-blogs" 
              className={`flex items-center h-full border-b-2 px-1 transition-colors ${
                isActive('/live-blogs') ? 'border-[#dc2626] text-[#dc2626]' : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-[#dc2626]"></span>
              Live Blogs
            </Link>
            
            <Link 
              to="/videos" 
              className={`flex items-center h-full border-b-2 px-1 transition-colors ${
                isActive('/videos') ? 'border-[#dc2626] text-[#dc2626]' : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Videos
            </Link>
            
            <Link 
              to="/photo-gallery" 
              className={`flex items-center h-full border-b-2 px-1 transition-colors ${
                isActive('/photo-gallery') ? 'border-[#dc2626] text-[#dc2626]' : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Photo Gallery
            </Link>

            {isAuthenticated && (user?.roles?.includes('reporter') || user?.permissions?.includes('create_content')) && (
              <Link 
                to="/reporter/dashboard" 
                className={`flex items-center h-full border-b-2 px-1 transition-colors ${
                  isActive('/reporter') ? 'border-[#dc2626] text-[#dc2626]' : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Create Post
              </Link>
            )}
            
            {isAuthenticated && ((user?.roles || [user?.role]).some(r => ['editor', 'admin'].includes(r)) || user?.permissions?.some(p => ['approve_content', 'manage_content', 'delete_content'].includes(p))) && (
              <Link 
                to="/editor/dashboard" 
                className={`flex items-center h-full border-b-2 px-1 transition-colors ${
                  isActive('/editor') ? 'border-[#dc2626] text-[#dc2626]' : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>

      <NotificationPanel 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
      />
    </>
  );
}
