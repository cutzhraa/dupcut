import React, { useCallback, useEffect, useRef, useState } from 'react';

export default function UpdateBanner({ hasBottomNav = false }) {
  const [registration, setRegistration] = useState(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dismissedWorker = useRef(null);
  const waitingForActivation = useRef(false);

  const showUpdateIfNew = useCallback((worker) => {
    if (!worker || worker === dismissedWorker.current) return;
    setHasUpdate(true);
  }, []);

  const observeInstallingWorker = useCallback((reg) => {
    const worker = reg.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateIfNew(reg.waiting || worker);
      }
    });
  }, [showUpdateIfNew]);

  const checkForUpdate = useCallback(async (reg) => {
    if (!reg) return;
    try {
      await reg.update();
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateIfNew(reg.waiting);
      } else if (reg.installing) {
        observeInstallingWorker(reg);
      }
    } catch {
      // A failed background check should not interrupt using the current app.
    }
  }, [observeInstallingWorker, showUpdateIfNew]);

  useEffect(() => {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) return undefined;

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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate(activeRegistration);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    navigator.serviceWorker.ready.then((reg) => {
      if (!isMounted) return;
      activeRegistration = reg;
      setRegistration(reg);
      reg.addEventListener('updatefound', handleUpdateFound);

      if (reg.waiting && navigator.serviceWorker.controller) showUpdateIfNew(reg.waiting);
      else observeInstallingWorker(reg);

      checkForUpdate(reg);
    }).catch(() => {});

    const periodicCheck = window.setInterval(() => checkForUpdate(activeRegistration), 30 * 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(periodicCheck);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activeRegistration?.removeEventListener('updatefound', handleUpdateFound);
    };
  }, [checkForUpdate, observeInstallingWorker, showUpdateIfNew]);

  const handleUpdate = () => {
    const waitingWorker = registration?.waiting;
    if (!waitingWorker) return;
    waitingForActivation.current = true;
    setIsUpdating(true);
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  const handleLater = () => {
    dismissedWorker.current = registration?.waiting || null;
    setHasUpdate(false);
  };

  if (import.meta.env.DEV || !hasUpdate) return null;

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
      <span>{isUpdating ? 'Memasang pembaruan…' : 'Versi baru DupCut tersedia.'}</span>
      {!isUpdating && (
        <>
          <button
            type="button"
            onClick={handleUpdate}
            style={{
              border: 0,
              borderRadius: '8px',
              padding: '8px 12px',
              background: '#fff',
              color: '#121814',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Update sekarang
          </button>
          <button
            type="button"
            onClick={handleLater}
            aria-label="Gunakan versi sekarang"
            style={{ border: 0, background: 'transparent', color: '#ddd', padding: '6px', cursor: 'pointer' }}
          >
            Nanti
          </button>
        </>
      )}
    </aside>
  );
}
