import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// A direct link or refresh to an app subpage should start at the landing page.
// Client-side navigation remains unchanged because this only runs on full page loads.
if (window.location.pathname !== '/') {
  window.history.replaceState(null, '', '/')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
