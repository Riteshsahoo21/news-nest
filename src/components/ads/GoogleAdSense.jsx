import React, { useEffect } from 'react';

export default function GoogleAdSense({ clientId, slot, format = 'auto', responsive = 'true', className = '' }) {
  useEffect(() => {
    try {
      if (window) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense Error: ", e);
    }
  }, []);

  // Use a default client ID if not provided, though the wrapper should provide it.
  const adClient = clientId || 'ca-pub-xxxxxxxxxxxxxx';

  return (
    <div className={`google-adsense-container w-full overflow-hidden flex justify-center items-center my-4 bg-gray-50/50 ${className}`}>
      <span className="absolute top-0 right-0 bg-black/10 text-gray-500 text-[10px] uppercase px-2 py-0.5 z-10 rounded-bl hidden">
        Ad
      </span>
      <ins 
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '100px' }}
        data-ad-client={adClient}
        data-ad-slot={slot || '1234567890'} // Provide a dummy slot ID if none provided
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
