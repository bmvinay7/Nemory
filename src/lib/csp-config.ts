/**
 * Content Security Policy Configuration
 * More permissive in development, strict in production
 */

export const getCSPDirectives = () => {
  const isDev = import.meta.env.DEV;
  
  const baseDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      'https://api.telegram.org',
      'https://api.notion.com',
      'https://generativelanguage.googleapis.com',
      'https://apis.google.com',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://accounts.google.com',
      'https://content.googleapis.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
      'https://accounts.google.com'
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
      'https://fonts.googleapis.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:'
    ],
    'connect-src': [
      "'self'",
      'https://api.telegram.org',
      'https://api.notion.com',
      'https://generativelanguage.googleapis.com',
      'https://*.firebaseapp.com',
      'https://*.googleapis.com',
      'https://www.google-analytics.com',
      'https://accounts.google.com',
      'https://oauth2.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://identitytoolkit.googleapis.com'
    ],
    'frame-src': [
      "'self'",
      'https://accounts.google.com',
      'https://*.firebaseapp.com'
    ],
    'frame-ancestors': ["'none'"]
  };

  // Add development-specific directives
  if (isDev) {
    baseDirectives['connect-src'].push('ws://localhost:*', 'http://localhost:*');
    baseDirectives['script-src'].push('http://localhost:*');
  }

  return baseDirectives;
};

export const generateCSPString = () => {
  const directives = getCSPDirectives();
  
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ') + ';';
};

// Export for use in meta tags or headers
export const CSP_STRING = generateCSPString();