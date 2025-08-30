import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/env-validation' // Validate environment on startup

// AGGRESSIVE service worker cleanup for development
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  console.log('🧹 Development mode: Cleaning up service workers and caches...');
  
  // Function to completely clear service workers
  const clearServiceWorkers = async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} service worker registrations`);
      
      for (const registration of registrations) {
        console.log('Unregistering service worker:', registration.scope);
        await registration.unregister();
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log(`Found ${cacheNames.length} caches to clear`);
        
        for (const cacheName of cacheNames) {
          console.log('Deleting cache:', cacheName);
          await caches.delete(cacheName);
        }
      }
      
      console.log('✅ Service workers and caches cleared');
    } catch (error) {
      console.warn('Error clearing service workers:', error);
    }
  };
  
  // If there's an active service worker controlling this page, we need to reload
  if (navigator.serviceWorker.controller) {
    console.log('🔄 Active service worker detected, clearing and reloading...');
    clearServiceWorkers().then(() => {
      // Add a flag to prevent infinite reload loop
      if (!sessionStorage.getItem('sw-cleared')) {
        sessionStorage.setItem('sw-cleared', 'true');
        window.location.reload();
      }
    });
  } else {
    // No active service worker, just clear any registrations
    clearServiceWorkers();
  }
  
  // Clear the flag after successful load
  if (sessionStorage.getItem('sw-cleared')) {
    sessionStorage.removeItem('sw-cleared');
  }
}

createRoot(document.getElementById("root")!).render(<App />);
