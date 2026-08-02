import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdSlot from './AdSlot';
import { X } from 'lucide-react';

export default function StickyMobileAd() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(5);
  
  // A premium user has a valid 'subscription' object or a role that implies premium
  const isPremium = user?.isPremium || user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));

  useEffect(() => {
    if (!isPremium && isVisible && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, isPremium, isVisible]);

  if (isPremium || !isVisible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="relative flex justify-center items-center w-full h-[70px]">
        {/* Countdown Close Button */}
        <button 
          disabled={countdown > 0}
          onClick={() => setIsVisible(false)}
          className={`absolute -top-6 right-0 border border-gray-200 p-1 rounded-tl-lg shadow-sm text-xs font-medium px-3 flex items-center gap-1 transition-colors ${
            countdown > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          aria-label="Close Advertisement"
        >
          {countdown > 0 ? (
            <span>Wait {countdown}s</span>
          ) : (
            <>
              <span>Close</span>
              <X className="w-3 h-3" />
            </>
          )}
        </button>
        
        <AdSlot position="sticky_footer" className="m-0 h-full w-full" />
      </div>
    </div>
  );
}
