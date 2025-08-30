// Service Worker Killer Script
// Run this in browser console to completely remove all service workers

(async function killAllServiceWorkers() {
  console.log('🧹 Killing all service workers and clearing caches...');
  
  if ('serviceWorker' in navigator) {
    try {
      // Get all registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} service worker registrations`);
      
      // Unregister all service workers
      for (const registration of registrations) {
        console.log('Unregistering:', registration.scope);
        await registration.unregister();
      }
      
      console.log('✅ All service workers unregistered');
    } catch (error) {
      console.error('Error unregistering service workers:', error);
    }
  }
  
  if ('caches' in window) {
    try {
      // Get all cache names
      const cacheNames = await caches.keys();
      console.log(`Found ${cacheNames.length} caches`);
      
      // Delete all caches
      for (const cacheName of cacheNames) {
        console.log('Deleting cache:', cacheName);
        await caches.delete(cacheName);
      }
      
      console.log('✅ All caches cleared');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }
  
  // Clear localStorage and sessionStorage
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Local storage cleared');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
  
  console.log('🎉 Complete cleanup finished! Reload the page.');
  
  // Automatically reload after cleanup
  setTimeout(() => {
    window.location.reload();
  }, 1000);
})();