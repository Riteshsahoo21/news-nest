import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdSlot from './AdSlot';
import { X } from 'lucide-react';

export default function StickyMobileAd() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(5);
  
  // Only staff can preview custom ads. Normal users do not see custom ads.
  const isStaff = user?.roles?.some(role => ['admin', 'editor', 'reporter'].includes(role));
  const isNormalUser = !isStaff;

  useEffect(() => {
    if (isStaff && isVisible && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, isStaff, isVisible]);

  if (isNormalUser || !isVisible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 md:hidden bg-card border-t border-border shadow-[0_-4px_10px_rgba(0,0,0,0.2)] w-full max-w-full overflow-visible min-w-0">
      <div className="relative flex justify-center items-center w-full h-[70px] min-w-0 overflow-visible">
        {/* Countdown Close Button */}
        <button 
          disabled={countdown > 0}
          onClick={() => setIsVisible(false)}
          className={`absolute -top-7 right-2 border border-b-0 border-border/80 py-1 px-3 rounded-t-lg shadow-md text-[11px] font-extrabold flex items-center gap-1.5 transition-all font-mono uppercase tracking-wider ${
            countdown > 0 
              ? 'bg-muted text-muted-foreground cursor-not-allowed border-t-2 border-t-amber-500' 
              : 'bg-card text-foreground hover:bg-red-600 hover:text-white border-t-2 border-t-red-600 active:scale-95'
          }`}
          aria-label="Close Advertisement"
        >
          {countdown > 0 ? (
            <span>Wait {countdown}s</span>
          ) : (
            <>
              <span>Close</span>
              <X className="w-3.5 h-3.5" />
            </>
          )}
        </button>
        
        <div className="w-full h-full overflow-hidden bg-card">
          <AdSlot 
            position="sticky_footer" 
            className="w-full !my-0 !p-0 h-[70px] !max-h-[70px] !rounded-none border-none shadow-none overflow-hidden block bg-card" 
            onAdEmpty={() => setIsVisible(false)} 
          />
        </div>
      </div>
    </div>
  );
}
