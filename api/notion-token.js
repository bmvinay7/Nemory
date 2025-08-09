// Serverless function to handle Notion OAuth token exchange
// This avoids CORS issues by making the API call server-side

// In-memory cache to track recent requests (simple duplicate prevention)
const recentRequests = new Map();
const REQUEST_CACHE_DURATION = 30000; // 30 seconds

// Clean up old requests periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentRequests.entries()) {
    if (now - timestamp > REQUEST_CACHE_DURATION) {
      recentRequests.delete(key);
    }
  }
}, 60000); // Clean up every minute

export default async function handler(req, res) {
  // Set CORS headers to allow frontend requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

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

    // Validate required parameters
    if (!code || !redirect_uri || !client_id || !client_secret) {
      const missing = [];
      if (!code) missing.push('code');
      if (!redirect_uri) missing.push('redirect_uri');
      if (!client_id) missing.push('client_id');
      if (!client_secret) missing.push('client_secret');
      
      console.error('Missing required parameters:', missing);
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: `Missing required parameters: ${missing.join(', ')}`,
        details: 'All OAuth parameters are required for token exchange'
      });
    }

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
        'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: grant_type,
        code: code.trim(),
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
      error_description: 'An internal error occurred during token exchange',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
