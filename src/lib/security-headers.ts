/**
 * Security Headers Configuration
 * Enhanced security headers for production deployment
 */

export const SECURITY_HEADERS = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Enforce HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Disable potentially dangerous features
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.telegram.org https://api.notion.com https://generativelanguage.googleapis.com https://apis.google.com https://www.googletagmanager.com https://www.google-analytics.com https://accounts.google.com https://content.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.telegram.org https://api.notion.com https://generativelanguage.googleapis.com https://*.firebaseapp.com https://*.googleapis.com https://www.google-analytics.com https://accounts.google.com https://oauth2.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com",
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')
};

/**
 * Security middleware for client-side
 */
export class SecurityMiddleware {
  /**
   * Initialize security measures
   */
  static initialize(): void {
    if (typeof window === 'undefined') return;

    // Disable right-click in production
    if (import.meta.env.PROD) {
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });

      // Disable F12, Ctrl+Shift+I, Ctrl+U
      document.addEventListener('keydown', (e) => {
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.key === 'u')
        ) {
          e.preventDefault();
        }
      });
    }

    // Clear sensitive data on page unload
    window.addEventListener('beforeunload', () => {
      // Clear any sensitive localStorage data
      const sensitiveKeys = ['temp_token', 'temp_data', 'debug_info'];
      sensitiveKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    });
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000); // Limit length
  }
}

export default SecurityMiddleware;