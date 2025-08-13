// Serverless function to handle Notion block children API calls
// This is specifically for fetching toggle children and nested blocks

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_REQUESTS = 30;

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
  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
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
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { accessToken, blockId } = body || {};

    // Input validation
    if (!accessToken || typeof accessToken !== 'string' || accessToken.length > 500) {
      return res.status(400).json({ error: 'Invalid or missing access token' });
    }
    
    if (!blockId || typeof blockId !== 'string' || blockId.length > 100) {
      return res.status(400).json({ error: 'Invalid or missing block ID' });
    }
    
    // Sanitize blockId
    const sanitizedBlockId = blockId.replace(/[^a-f0-9-]/gi, '');

    // Make the actual request to Notion API
    const response = await fetch(`https://api.notion.com/v1/blocks/${sanitizedBlockId}/children`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notion API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Notion API request failed', 
        details: errorText 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Notion block children error:', error);
    try {
      return res.status(500).json({ 
        error: 'Failed to fetch Notion block children',
        details: error.message 
      });
    } catch (_) {
      res.statusCode = 500;
      res.end('Failed to fetch Notion block children');
    }
  }
}