// Serverless function to handle Notion search API calls
// This avoids CORS issues when calling Notion API from the browser

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Max 30 requests per minute per IP

// Clean up rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

function checkRateLimit(ip) {
  const now = Date.now();
  const clientData = rateLimitMap.get(ip) || { count: 0, windowStart: now };
  
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
      error_description: 'Too many requests. Please try again later.'
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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check request size limit (1MB)
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return res.status(413).json({ error: 'Request too large' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      if (body.length > 1024 * 1024) {
        return res.status(413).json({ error: 'Request body too large' });
      }
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { accessToken, filter, sort, page_size } = body || {};

    // Input validation
    if (!accessToken || typeof accessToken !== 'string' || accessToken.length > 500) {
      return res.status(400).json({ error: 'Invalid or missing access token' });
    }
    
    if (page_size && (typeof page_size !== 'number' || page_size < 1 || page_size > 100)) {
      return res.status(400).json({ error: 'Invalid page size. Must be between 1 and 100' });
    }
    
    // Sanitize inputs
    const sanitizedPageSize = page_size && typeof page_size === 'number' ? Math.min(Math.max(page_size, 1), 100) : 20;

    // Make the actual request to Notion API
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter,
        sort,
        page_size: sanitizedPageSize
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notion API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Notion API request failed'
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Notion search error:', error);
    try {
      return res.status(500).json({ 
        error: 'Failed to search Notion content'
      });
    } catch (_) {
      // Fallback if res helpers not available
      res.statusCode = 500;
      res.end('Failed to search Notion content');
    }
  }
}
