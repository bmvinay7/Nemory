# Nemory Development Troubleshooting Guide

## Common Issues and Solutions

### 1. Blank Page with Service Worker Errors

**Symptoms:**
- Blank page in browser
- Console errors: "FetchEvent.respondWith received an error: TypeError: Load failed"
- Errors loading `@react-refresh`, `@vite/client`, or `main.tsx`

**Solutions:**

#### Quick Fix:
1. **Clear browser data completely:**
   - Chrome: Ctrl+Shift+Delete → Select "All time" → Check all boxes → Clear data
   - Firefox: Ctrl+Shift+Delete → Select "Everything" → Check all boxes → Clear Now
   - Safari: Develop menu → Empty Caches

2. **Clear service workers:**
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Service Workers" in sidebar
   - Click "Unregister" for any service workers
   - Click "Storage" in sidebar
   - Click "Clear site data"

3. **Use incognito/private browsing mode**

4. **Try a different port:**
   ```bash
   npm run dev -- --port 3000
   ```

#### Advanced Fix:
1. **Remove build artifacts:**
   ```bash
   rm -rf dist
   rm -rf node_modules/.vite
   ```

2. **Force Vite to rebuild:**
   ```bash
   npm run dev -- --force
   ```

3. **Complete reset:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev -- --force
   ```

### 2. Environment Variables Not Working

**Symptoms:**
- Features not working (Firebase, Notion, Telegram)
- Console warnings about missing environment variables

**Solutions:**
1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your actual values in `.env`:**
   - Get Firebase config from Firebase Console
   - Get Notion OAuth credentials from Notion Developers
   - Get Telegram bot token from BotFather

3. **Restart the development server after changing `.env`**

### 3. Build Errors

**Symptoms:**
- TypeScript compilation errors
- Build fails with syntax errors

**Solutions:**
1. **Check for syntax errors:**
   ```bash
   npm run build
   ```

2. **Run linting to find issues:**
   ```bash
   npm run lint
   ```

3. **Fix TypeScript errors:**
   - Most errors are related to `any` types
   - These are warnings and don't break functionality

### 4. API Endpoints Not Working

**Symptoms:**
- 404 errors for `/api/*` endpoints
- CORS errors

**Solutions:**
1. **Ensure you're using the development server:**
   ```bash
   npm run dev
   ```

2. **Check Vite configuration:**
   - The `vite.config.ts` includes local API middleware
   - API files should be in the `/api` directory

3. **Verify API files exist:**
   ```bash
   ls -la api/
   ```

### 5. Port Already in Use

**Symptoms:**
- "Port 8080 is in use" message
- Server starts on different port

**Solutions:**
1. **Use a specific port:**
   ```bash
   npm run dev -- --port 3000
   ```

2. **Kill processes using the port:**
   ```bash
   lsof -ti:8080 | xargs kill -9
   ```

## Development Commands

### Basic Commands
```bash
# Start development server
npm run dev

# Start on specific port
npm run dev -- --port 3000

# Force rebuild dependencies
npm run dev -- --force

# Build for production
npm run build

# Preview production build
npm run preview
```

### Debugging Commands
```bash
# Run debug script
node debug-dev-server.js

# Check for TypeScript errors
npx tsc --noEmit

# Run comprehensive tests
npm run test:comprehensive

# Check security
npm run security:audit
```

### Clean Up Commands
```bash
# Remove build artifacts
rm -rf dist node_modules/.vite

# Complete clean install
rm -rf node_modules package-lock.json && npm install

# Clear browser data (manual step required)
```

## Browser-Specific Issues

### Chrome
- Clear site data: DevTools → Application → Storage → Clear site data
- Disable cache: DevTools → Network → Disable cache (while DevTools open)

### Firefox
- Clear everything: Ctrl+Shift+Delete → Everything → Clear Now
- Disable cache: DevTools → Settings → Disable cache

### Safari
- Clear caches: Develop → Empty Caches
- Disable cache: Develop → Disable Caches

## Still Having Issues?

1. **Try the debug script:**
   ```bash
   node debug-dev-server.js
   ```

2. **Check the browser console for specific errors**

3. **Try a different browser or incognito mode**

4. **Restart your computer** (sometimes helps with port conflicts)

5. **Check if antivirus/firewall is blocking the development server**

## Success Indicators

When everything is working correctly, you should see:
- ✅ Development server starts without errors
- ✅ Browser loads the page without blank screen
- ✅ No service worker errors in console
- ✅ Hot module replacement works (changes reflect immediately)
- ✅ API endpoints respond (check Network tab in DevTools)

## Environment Setup Checklist

- [ ] Node.js installed (v16 or higher)
- [ ] npm dependencies installed (`npm install`)
- [ ] `.env` file created and configured
- [ ] No `dist` directory in development
- [ ] Browser cache cleared
- [ ] Service workers unregistered
- [ ] Development server running on available port