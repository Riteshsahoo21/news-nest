import React from 'react';
import { Globe, Gamepad2, MapPin, Loader2 } from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All Stories', icon: Globe },
  { id: 'nearby', label: 'Near me', icon: MapPin },
  { id: 'in', label: 'India', flag: '🇮🇳' },
  { id: 'us', label: 'United States', flag: '🇺🇸' },
  { id: 'gb', label: 'United Kingdom', flag: '🇬🇧' },
  { id: 'esports', label: 'Esports & Gaming', icon: Gamepad2 }
];

export default function CountryFilterPills({
  selectedFilter = 'all',
  onSelectFilter,
  locationLabel = '',
  locating = false
}) {
  return (
    <div className="w-full overflow-x-auto scrollbar-none py-1.5 flex items-center gap-2 sm:gap-2.5">
      <span className="text-xs uppercase tracking-wider font-mono font-bold text-muted-foreground mr-1 shrink-0 hidden sm:inline-block">
        Region:
      </span>
      {FILTERS.map((f) => {
        const isActive = selectedFilter === f.id;
        const IconComponent = f.id === 'nearby' && locating ? Loader2 : f.icon;
        const label = f.id === 'nearby' && locationLabel ? locationLabel : f.label;

        return (
          <button
            key={f.id}
            onClick={() => onSelectFilter(f.id)}
            type="button"
            aria-pressed={isActive}
            title={f.id === 'nearby' && locationLabel ? `Local news near ${locationLabel}` : f.label}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 shadow-xs cursor-pointer border ${
              isActive
                ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-500/20'
                : 'bg-card text-foreground/80 border-border/70 hover:border-border hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            {f.flag && <span className="text-sm leading-none">{f.flag}</span>}
            {IconComponent && <IconComponent className={`w-3.5 h-3.5 ${locating && f.id === 'nearby' ? 'animate-spin' : ''} ${isActive ? 'text-white' : 'text-primary'}`} />}
            <span className="max-w-[180px] truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
