# Security Policy

## Overview

This document outlines the security measures implemented in the Nemory application and provides guidelines for maintaining security.

## Security Measures Implemented

### 1. Authentication & Authorization
- ✅ Firebase Authentication with secure token validation
- ✅ Server-side route protection with token verification
- ✅ Email verification requirements for sensitive operations
- ✅ Secure session management

### 2. API Security
- ✅ Rate limiting on all API endpoints (10-30 requests/minute per IP)
- ✅ Input validation and sanitization
- ✅ Request size limits (1MB max)
- ✅ CORS configuration with allowed origins only
- ✅ Proper error handling without information disclosure

### 3. Data Protection
- ✅ Firestore security rules with user-specific access
- ✅ Input sanitization for all user data
- ✅ Content length limits to prevent abuse
- ✅ Secure environment variable validation

### 4. Frontend Security
- ✅ Content Security Policy (CSP) headers
- ✅ XSS protection headers
- ✅ Secure cookie settings
- ✅ Input escaping for Telegram messages
- ✅ TypeScript strict mode enabled

### 5. Infrastructure Security
- ✅ HTTPS enforcement
- ✅ Security headers (HSTS, X-Frame-Options, etc.)
- ✅ Environment variable validation
- ✅ Debug code removal from production

## Environment Variables

### Required Variables
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Google AI (Optional)
VITE_GOOGLE_AI_API_KEY=AIza...

# Telegram Bot (Optional)
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCDEF...

# Notion OAuth (Optional)
VITE_NOTION_CLIENT_ID=uuid-format
VITE_NOTION_CLIENT_SECRET=secret
VITE_NOTION_REDIRECT_URI=https://your-domain.com/auth/notion/callback
```

### Security Requirements
- All API keys must be valid format
- No placeholder or test values in production
- Localhost URLs not allowed in production
- All secrets must be properly secured

## Firestore Security Rules

The application uses strict Firestore security rules:

```javascript
// Users can only access their own data
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Summaries are user-specific
match /summaries/{summaryId} {
  allow read, write: if request.auth != null && 
    (request.auth.uid == resource.data.userId || 
     request.auth.uid == request.resource.data.userId);
}

// All other access is denied
match /{document=**} {
  allow read, write: if false;
}
```

## API Rate Limits

- **Token Exchange**: 10 requests/minute per IP
- **Notion Search**: 30 requests/minute per IP
- **Page Content**: 30 requests/minute per IP
- **Page Details**: 30 requests/minute per IP

## Input Validation

All user inputs are validated and sanitized:

### API Endpoints
- Request size limited to 1MB
- Parameter type validation
- Length limits on all string inputs
- Special character sanitization

### Telegram Messages
- Content length limits (4096 characters)
- MarkdownV2 escaping
- Control character removal
- Input type validation

### Summary Data
- Summary content limited to 10,000 characters
- Key insights limited to 10 items, 500 characters each
- Action items limited to 20 items, 300 characters each

## Security Headers

The following security headers are implemented:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [detailed policy]
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: [your-security-email]
3. Include detailed information about the vulnerability
4. Allow reasonable time for response before public disclosure

## Security Checklist for Deployment

Before deploying to production:

- [ ] All environment variables are properly configured
- [ ] No debug code or console.logs in production build
- [ ] Firestore security rules are restrictive
- [ ] API rate limiting is enabled
- [ ] Security headers are configured
- [ ] HTTPS is enforced
- [ ] All dependencies are up to date
- [ ] Security scanning has been performed

## Regular Security Maintenance

### Monthly Tasks
- [ ] Review and rotate API keys if needed
- [ ] Check for dependency vulnerabilities
- [ ] Review Firestore security rules
- [ ] Audit user access patterns

### Quarterly Tasks
- [ ] Perform security penetration testing
- [ ] Review and update security policies
- [ ] Audit authentication flows
- [ ] Review error handling and logging

## Incident Response

In case of a security incident:

1. **Immediate Response**
   - Identify and contain the issue
   - Revoke compromised credentials
   - Document the incident

2. **Investigation**
   - Determine scope of impact
   - Identify root cause
   - Collect evidence

3. **Recovery**
   - Implement fixes
   - Restore services
   - Monitor for additional issues

4. **Post-Incident**
   - Conduct post-mortem
   - Update security measures
   - Communicate with stakeholders

## Contact

For security-related questions or concerns:
- Security Email: [your-security-email]
- General Contact: [your-general-email]

---

**Last Updated**: [Current Date]
**Version**: 1.0