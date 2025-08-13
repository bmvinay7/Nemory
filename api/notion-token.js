// Serverless function to handle Notion OAuth token exchange
// This avoids CORS issues by making the API call server-side

// In-memory cache to track recent requests (simple duplicate prevention)
const recentRequests = new Map();
const REQUEST_CACHE_DURATION = 30000; // 30 seconds

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per minute per IP

// Clean up old requests periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentRequests.entries()) {
    if (now - timestamp > REQUEST_CACHE_DURATION) {
      recentRequests.delete(key);
    }
  }
  // Clean up rate limit entries
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000); // Clean up every minute

// Rate limiting function
function checkRateLimit(ip) {
  const now = Date.now();
  const clientData = rateLimitMap.get(ip) || { count: 0, windowStart: now };
  
  // Reset window if expired
  if (now - clientData.windowStart > RATE_LIMIT_WINDOW) {
    clientData.count = 0;
    clientData.windowStart = now;
  }
  
  clientData.count++;
  rateLimitMap.set(ip, clientData);
  
  return clientData.count <= RATE_LIMIT_MAX_REQUESTS;
}

export default async function handler(req, res) {
  // Get client IP for rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  // Check rate limit
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      error_description: 'Too many requests. Please try again later.',
      retry_after: Math.ceil(RATE_LIMIT_WINDOW / 1000)
    });
  }

  // Set CORS headers with proper origin validation
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://nemory.vercel.app',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Notion OAuth serverless function called');
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    
    const { 
      code, 
      redirect_uri, 
      client_id, 
      client_secret, 
      grant_type = 'authorization_code' 
    } = req.body;

    console.log('Request body (sanitized):', {
      hasCode: !!code,
      hasRedirectUri: !!redirect_uri,
      hasClientId: !!client_id,
      hasClientSecret: !!client_secret,
      grantType: grant_type,
      redirectUri: redirect_uri,
      clientId: client_id
    });

    // Input validation and sanitization
    if (!code || typeof code !== 'string' || code.length > 1000) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'Invalid or missing authorization code'
      });
    }
    
    if (!redirect_uri || typeof redirect_uri !== 'string' || !redirect_uri.startsWith('http')) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'Invalid or missing redirect URI'
      });
    }
    
    if (!client_id || typeof client_id !== 'string' || client_id.length > 100) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'Invalid or missing client ID'
      });
    }
    
    if (!client_secret || typeof client_secret !== 'string' || client_secret.length > 200) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'Invalid or missing client secret'
      });
    }

    // Sanitize inputs
    const sanitizedCode = code.trim().replace(/[^\w-]/g, '');
    const sanitizedClientId = client_id.trim();
    const sanitizedClientSecret = client_secret.trim();

    // Validate grant type
    if (grant_type !== 'authorization_code') {
      console.error('Invalid grant type:', grant_type);
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      });
    }

    // Check for duplicate requests (prevent double token exchange)
    const requestKey = `${code}_${client_id}`;
    const now = Date.now();
    
    if (recentRequests.has(requestKey)) {
      const timeSinceLastRequest = now - recentRequests.get(requestKey);
      if (timeSinceLastRequest < REQUEST_CACHE_DURATION) {
        console.warn('Duplicate token exchange request detected:', requestKey);
        return res.status(409).json({
          error: 'duplicate_request',
          error_description: 'This authorization code is already being processed or has been used recently'
        });
      }
    }
    
    // Mark this request as being processed
    recentRequests.set(requestKey, now);

    console.log('Making token exchange request to Notion API...');

    // Make the token exchange request to Notion
    const notionResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${sanitizedClientId}:${sanitizedClientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: grant_type,
        code: sanitizedCode,
        redirect_uri: redirect_uri,
      }),
    });

    console.log('Notion API response status:', notionResponse.status);
    console.log('Notion API response headers:', Object.fromEntries(notionResponse.headers.entries()));

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error('Notion API error response:', errorText);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (parseError) {
        console.error('Failed to parse Notion error response:', parseError);
        error = { 
          error: 'unknown_error', 
          error_description: errorText || 'Unknown error from Notion API' 
        };
      }

      // Map Notion API errors to appropriate HTTP status codes
      let statusCode = notionResponse.status;
      if (error.error === 'invalid_grant') {
        statusCode = 400;
      } else if (error.error === 'invalid_client') {
        statusCode = 401;
      } else if (error.error === 'invalid_request') {
        statusCode = 400;
      }

      return res.status(statusCode).json({
        error: error.error || 'token_exchange_failed',
        error_description: error.error_description || errorText || 'Token exchange failed'
      });
    }

    const tokenData = await notionResponse.json();
    console.log('Token exchange successful - received data keys:', Object.keys(tokenData));
    
    // Validate the response structure
    if (!tokenData.access_token) {
      console.error('Invalid token response: missing access_token', tokenData);
      return res.status(500).json({
        error: 'invalid_response',
        error_description: 'Invalid token response from Notion API'
      });
    }

    // Log successful exchange (without sensitive data)
    console.log('Token exchange completed successfully:', {
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      workspaceName: tokenData.workspace_name,
      workspaceId: tokenData.workspace_id,
      botId: tokenData.bot_id,
      hasOwner: !!tokenData.owner
    });

    // Return the token data
    return res.status(200).json(tokenData);

  } catch (error) {
    console.error('Serverless function error:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      error: 'internal_server_error',
      error_description: 'An internal error occurred during token exchange'
    });
  }
}
