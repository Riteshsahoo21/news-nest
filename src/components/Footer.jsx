import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto pt-16 pb-8 md:pb-12">
      <div className="max-w-[1640px] mx-auto px-3 sm:px-6 md:px-10 xl:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand & About */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center shrink-0 space-x-2">
              <svg width="46" height="42" viewBox="0 0 60 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="footerBlueGradient" x1="0" y1="0" x2="0" y2="55" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#003399"/>
                    <stop offset="1" stopColor="#001a4d"/>
                  </linearGradient>
                  <linearGradient id="footerLightBlueGradient" x1="0" y1="0" x2="30" y2="55" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4d94ff"/>
                    <stop offset="1" stopColor="#0047b3"/>
                  </linearGradient>
                </defs>
                <path d="M5 15 L20 15 L35 45 L15 52 Z" fill="url(#footerBlueGradient)"/>
                <path d="M18 15 Q30 5 45 15 L45 45 Q30 35 15 52 Z" fill="url(#footerLightBlueGradient)"/>
                <path d="M22 20 Q32 15 42 22" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M25 25 Q35 20 42 27" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M28 30 Q36 26 42 32" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M29 35 Q37 31 42 37" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M27 40 Q35 36 42 42" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M23 45 Q31 41 38 46" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M28 10 A15 15 0 0 1 45 0" stroke="#ff0000" strokeWidth="3" fill="none" strokeLinecap="round"/>
                <path d="M30 14 A10 10 0 0 1 40 5" stroke="#ff0000" strokeWidth="3" fill="none" strokeLinecap="round"/>
                <path d="M33 17 A5 5 0 0 1 37 11" stroke="#ff0000" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
              <div className="flex flex-col justify-center">
                <span className="text-[28px] font-black leading-none tracking-tight font-sans">
                  <span className="text-[#002169] dark:text-blue-400">News</span><span className="text-[#e60000]">Nest</span>
                </span>
                <span className="text-[10px] text-gray-700 dark:text-gray-400 font-medium tracking-wide mt-1 leading-none">
                  Your Daily News, Smartly Sorted
                </span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Delivering accurate, unbiased, and breaking news from around the world. Stay informed with our deep dives and real-time reporting.
            </p>
            <div className="flex items-center space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-foreground">Quick Links</h3>
            <ul className="space-y-4 text-sm">
              <li><Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/categories" className="text-muted-foreground hover:text-primary transition-colors">Categories</Link></li>
              <li><Link to="/videos" className="text-muted-foreground hover:text-primary transition-colors">Video News</Link></li>
              <li><Link to="/photo-gallery" className="text-muted-foreground hover:text-primary transition-colors">Photo Gallery</Link></li>
              <li><Link to="/live-blogs" className="text-muted-foreground hover:text-primary transition-colors">Live Blogs</Link></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-foreground">Support</h3>
            <ul className="space-y-4 text-sm">
              <li><Link to="/subscriptions" className="text-muted-foreground hover:text-primary transition-colors">Subscription Plans</Link></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Advertise with Us</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-foreground">Contact Us</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start space-x-3 text-muted-foreground">
                <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                <span>123 News Avenue, Media District<br />New York, NY 10001</span>
              </li>
              <li className="flex items-center space-x-3 text-muted-foreground">
                <Phone className="w-5 h-5 shrink-0" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center space-x-3 text-muted-foreground">
                <Mail className="w-5 h-5 shrink-0" />
                <span>support@newsnest.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} NewsNest. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <a href="#" className="hover:text-primary transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
