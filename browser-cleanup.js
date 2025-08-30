
// Paste this in browser console (F12) to automatically clean up
(async function() {
  console.log('🧹 Cleaning up service workers and caches...');
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (let reg of regs) {
      console.log('Unregistering:', reg.scope);
      await reg.unregister();
    }
  }
  
  // Clear all caches
  if ('caches' in window) {
    const names = await caches.keys();
    for (let name of names) {
      console.log('Deleting cache:', name);
      await caches.delete(name);
    }
  }
  
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
  
  console.log('✅ Cleanup complete! Reloading...');
  location.reload();
})();
