/**
 * Firebase Diagnostics and CORS Issue Resolution
 */

export class FirebaseDiagnostics {
  static async checkFirebaseConnection(): Promise<{
    isConnected: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let isConnected = true;

    try {
      // Check if we're in development
      const isDev = import.meta.env.DEV;
      const currentDomain = window.location.hostname;
      
      console.log('🔍 Firebase Diagnostics:', {
        environment: isDev ? 'development' : 'production',
        domain: currentDomain,
        protocol: window.location.protocol,
        port: window.location.port
      });

      // Check Firebase configuration
      const requiredEnvVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID'
      ];

      const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
      
      if (missingVars.length > 0) {
        issues.push(`Missing environment variables: ${missingVars.join(', ')}`);
        recommendations.push('Set all required Firebase environment variables');
        isConnected = false;
      }

      // Check for CORS issues
      if (currentDomain === 'localhost' && !isDev) {
        issues.push('Running on localhost in production mode');
        recommendations.push('Use development mode for localhost testing');
      }

      // Check authorized domains
      const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
      if (authDomain && !currentDomain.includes(authDomain.replace('.firebaseapp.com', ''))) {
        if (currentDomain !== 'localhost') {
          issues.push(`Domain ${currentDomain} may not be authorized in Firebase`);
          recommendations.push(`Add ${currentDomain} to Firebase Auth authorized domains`);
        }
      }

      // Check for emulator configuration
      if (import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
        if (currentDomain !== 'localhost') {
          issues.push('Firestore emulator enabled on non-localhost domain');
          recommendations.push('Disable Firestore emulator for non-localhost environments');
        }
      }

      return { isConnected, issues, recommendations };

    } catch (error) {
      console.error('Firebase diagnostics failed:', error);
      return {
        isConnected: false,
        issues: ['Failed to run diagnostics'],
        recommendations: ['Check browser console for detailed errors']
      };
    }
  }

  static async fixCORSIssues(): Promise<void> {
    console.log('🔧 Attempting to resolve CORS issues...');
    
    const diagnostics = await this.checkFirebaseConnection();
    
    if (diagnostics.issues.length > 0) {
      console.log('🚨 Issues found:');
      diagnostics.issues.forEach(issue => console.log(`   • ${issue}`));
      
      console.log('💡 Recommendations:');
      diagnostics.recommendations.forEach(rec => console.log(`   • ${rec}`));
    } else {
      console.log('✅ No configuration issues detected');
    }

    // Additional CORS fixes
    console.log('🔧 CORS Resolution Steps:');
    console.log('1. Add your domain to Firebase Console > Authentication > Settings > Authorized domains');
    console.log('2. Ensure HTTPS is used in production');
    console.log('3. Check that Firebase project ID matches your configuration');
    console.log('4. Verify Firestore rules allow your operations');
  }
}

// Auto-run diagnostics in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(() => {
    FirebaseDiagnostics.checkFirebaseConnection().then(result => {
      if (!result.isConnected || result.issues.length > 0) {
        console.log('🔍 Firebase Connection Issues Detected');
        FirebaseDiagnostics.fixCORSIssues();
      }
    });
  }, 2000);
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).firebaseDiagnostics = FirebaseDiagnostics;
}