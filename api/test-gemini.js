/**
 * Test Gemini API endpoint
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.VITE_GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Google AI API key not configured',
        hasKey: false
      });
    }

    console.log(`🤖 Testing Gemini API with key: ${apiKey.substring(0, 10)}...`);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Hello, please respond with 'API is working'" }]
        }]
      })
    });

    console.log(`🤖 Gemini API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Gemini API error: ${errorText}`);
      return res.status(response.status).json({
        error: `Gemini API error: ${response.status}`,
        details: errorText,
        hasKey: true,
        keyPrefix: apiKey.substring(0, 10)
      });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    res.status(200).json({
      success: true,
      hasKey: true,
      keyPrefix: apiKey.substring(0, 10),
      response: generatedText,
      fullResponse: data
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}