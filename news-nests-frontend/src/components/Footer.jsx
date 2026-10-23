import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

const footerLinkClass = 'text-muted-foreground hover:text-primary transition-colors duration-200';

export default function Footer() {
  return (
    <footer className="bg-background mt-auto pt-10 pb-28 md:pb-10 w-full max-w-full overflow-hidden min-w-0">
      <div className="max-w-[1640px] mx-auto px-3.5 sm:px-6 md:px-10 xl:px-12 w-full min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-16 mb-10">
          <div className="space-y-5">
            <Link to="/" className="flex items-center shrink-0 space-x-2" aria-label="RitzlaNews home">
              <svg width="46" height="42" viewBox="0 0 60 55" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="footerBlueGradient" x1="0" y1="0" x2="0" y2="55" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#003399" />
                    <stop offset="1" stopColor="#001a4d" />
                  </linearGradient>
                  <linearGradient id="footerLightBlueGradient" x1="0" y1="0" x2="30" y2="55" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4d94ff" />
                    <stop offset="1" stopColor="#0047b3" />
                  </linearGradient>
                </defs>
                <path d="M5 15 L20 15 L35 45 L15 52 Z" fill="url(#footerBlueGradient)" />
                <path d="M18 15 Q30 5 45 15 L45 45 Q30 35 15 52 Z" fill="url(#footerLightBlueGradient)" />
                <path d="M22 20 Q32 15 42 22 M25 25 Q35 20 42 27 M28 30 Q36 26 42 32 M29 35 Q37 31 42 37 M27 40 Q35 36 42 42 M23 45 Q31 41 38 46" stroke="white" strokeWidth="2" fill="none" />
                <path d="M28 10 A15 15 0 0 1 45 0 M30 14 A10 10 0 0 1 40 5 M33 17 A5 5 0 0 1 37 11" stroke="#ff0000" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
              <span className="text-[27px] font-black leading-none tracking-tight font-sans">
                <span className="text-[#002169] dark:text-blue-400">Ritzla</span><span className="text-[#e60000]">News</span>
              </span>
            </Link>
            <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
              Independent reporting, local perspectives, and the latest stories from around the world.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="font-bold text-lg mb-5 text-foreground">Explore</h2>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className={footerLinkClass}>Home</Link></li>
              <li><Link to="/categories" viewTransition className={footerLinkClass}>Categories</Link></li>
              <li><Link to="/videos" className={footerLinkClass}>Video News</Link></li>
              <li><Link to="/photo-gallery" className={footerLinkClass}>Photo Gallery</Link></li>
              <li><Link to="/live-blogs" className={footerLinkClass}>Live Blogs</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className="font-bold text-lg mb-5 text-foreground">Information</h2>
            <ul className="space-y-3 text-sm">
              <li><Link to="/privacy-policy" viewTransition className={footerLinkClass}>Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" viewTransition className={footerLinkClass}>Terms of Service</Link></li>
              <li><a href="mailto:support@newsnest.com" className={`inline-flex items-center gap-2 ${footerLinkClass}`}><Mail className="w-4 h-4" /> Contact support</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} RitzlaNews. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link to="/privacy-policy" viewTransition className={footerLinkClass}>Privacy</Link>
            <span className="w-1 h-1 rounded-full bg-border" aria-hidden="true" />
            <Link to="/terms-of-service" viewTransition className={footerLinkClass}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
