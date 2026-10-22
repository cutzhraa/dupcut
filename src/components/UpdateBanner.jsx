import React, { useState, useEffect } from 'react';

export default function UpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setShowUpdate(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div style={{
      background: '#121814',
      color: '#fff',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      <span>✨ Versi baru DupCut tersedia! Perbarui sekarang untuk menikmati fitur terbaru.</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleUpdate}
          style={{
            background: '#ffffff',
            color: '#121814',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Perbarui
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          style={{
            background: 'transparent',
            color: '#aaa',
            border: 'none',
            padding: '6px 10px',
            cursor: 'pointer'
          }}
        >
          Nanti
        </button>
      </div>
    </div>
  );
}