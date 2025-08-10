// Serverless function to handle Notion block children API calls
// This is specifically for fetching toggle children and nested blocks

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

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

    if (!accessToken || !blockId) {
      return res.status(400).json({ error: 'Access token and block ID are required' });
    }

    // Make the actual request to Notion API
    const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children`, {
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