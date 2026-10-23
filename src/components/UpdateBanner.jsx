import React, { useCallback, useEffect, useRef, useState } from 'react';

export default function UpdateBanner({ hasBottomNav = false }) {
  const [registration, setRegistration] = useState(null);
  const [status, setStatus] = useState('idle');
  const [isDismissed, setIsDismissed] = useState(false);
  const waitingForActivation = useRef(false);

  const observeInstallingWorker = useCallback((reg) => {
    const worker = reg.installing;
    if (!worker) return false;

    setStatus('checking');
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        setStatus('available');
        setIsDismissed(false);
      }
    });
    return true;
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    let activeRegistration;
    let isMounted = true;
    const handleUpdateFound = () => {
      if (activeRegistration) observeInstallingWorker(activeRegistration);
    };
    const handleControllerChange = () => {
      if (!waitingForActivation.current) return;
      waitingForActivation.current = false;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.ready.then((reg) => {
      if (!isMounted) return;
      activeRegistration = reg;
      setRegistration(reg);
      reg.addEventListener('updatefound', handleUpdateFound);

      if (reg.waiting && navigator.serviceWorker.controller) {
        setStatus('available');
      } else {
        observeInstallingWorker(reg);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      activeRegistration?.removeEventListener('updatefound', handleUpdateFound);
    };
  }, [observeInstallingWorker]);

  const activateWaitingWorker = (worker) => {
    if (!worker) return false;
    waitingForActivation.current = true;
    setStatus('updating');
    worker.postMessage({ type: 'SKIP_WAITING' });
    return true;
  };

  const handleCheckOrUpdate = async () => {
    if (status === 'available' && registration?.waiting) {
      activateWaitingWorker(registration.waiting);
      return;
    }

    if (!('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    setStatus('checking');
    setIsDismissed(false);
    try {
      const activeRegistration = registration || await navigator.serviceWorker.ready;
      setRegistration(activeRegistration);
      await activeRegistration.update();
      if (activeRegistration.waiting && navigator.serviceWorker.controller) {
        setStatus('available');
        return;
      }
      if (observeInstallingWorker(activeRegistration)) return;

      // A deployment can update the app bundle without changing the service worker.
      // Reloading after an explicit check fetches the latest app shell and assets.
      setStatus('updating');
      window.location.reload();
    } catch {
      setStatus('error');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (status === 'available') setStatus('idle');
  };

  const label = {
    idle: 'Cek pembaruan',
    checking: 'Mengecek…',
    available: 'Update sekarang',
    updating: 'Memasang update…',
    unsupported: 'Update PWA tidak tersedia',
    error: 'Gagal mengecek update — coba lagi'
  }[status];

  const showAvailable = status === 'available' && !isDismissed;
  const showStatus = status === 'unsupported' || status === 'error';

  if (import.meta.env.DEV) return null;

  return (
    <aside
      aria-live="polite"
      style={{
        position: 'fixed',
        right: '16px',
        bottom: hasBottomNav ? '84px' : '16px',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: 'calc(100vw - 32px)',
        padding: '8px',
        borderRadius: '12px',
        background: '#121814',
        color: '#fff',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        fontSize: '13px'
      }}
    >
      {showAvailable && <span>Versi baru tersedia.</span>}
      {showStatus && <span>{label}</span>}
      <button
        type="button"
        onClick={handleCheckOrUpdate}
        disabled={status === 'checking' || status === 'updating'}
        style={{
          border: 0,
          borderRadius: '8px',
          padding: '8px 12px',
          background: '#fff',
          color: '#121814',
          fontWeight: 700,
          cursor: status === 'checking' || status === 'updating' ? 'wait' : 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </button>
      {showAvailable && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Gunakan versi sekarang"
          style={{ border: 0, background: 'transparent', color: '#ddd', padding: '6px', cursor: 'pointer' }}
        >
          Nanti
        </button>
      )}
    </aside>
  );
}
