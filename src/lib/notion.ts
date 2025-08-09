// Notion OAuth Integration
// This follows the same pattern as Zapier, Make.com, and other SaaS platforms

export interface NotionOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface NotionTokenResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon: string;
  workspace_id: string;
  owner: {
    type: string;
    user?: {
      id: string;
      name: string;
      avatar_url: string;
      type: string;
      person: {
        email: string;
      };
    };
  };
}

export class NotionOAuthService {
  private config: NotionOAuthConfig;

  constructor(config: NotionOAuthConfig) {
    this.config = config;
  }

  // Generate the OAuth authorization URL
  generateAuthUrl(state?: string): string {
    console.log('NotionOAuth: generateAuthUrl called with state:', !!state);
    console.log('NotionOAuth: Config check:', {
      hasClientId: !!this.config.clientId,
      hasClientSecret: !!this.config.clientSecret,
      hasRedirectUri: !!this.config.redirectUri,
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri
    });

    if (!this.config.clientId) {
      const error = 'Missing Notion Client ID - check your environment variables';
      console.error('NotionOAuth:', error);
      throw new Error(error);
    }

    if (!this.config.redirectUri) {
      const error = 'Missing redirect URI - check your environment variables';
      console.error('NotionOAuth:', error);
      throw new Error(error);
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      owner: 'user',
      redirect_uri: this.config.redirectUri,
    });

    if (state) {
      params.append('state', state);
    }

    const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
    console.log('NotionOAuth: Generated auth URL:', authUrl);
    console.log('NotionOAuth: URL parameters:', Object.fromEntries(params));
    
    return authUrl;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<NotionTokenResponse> {
    console.log('NotionOAuth: Exchanging code for token...');
    console.log('NotionOAuth: Using redirect URI:', this.config.redirectUri);
    console.log('NotionOAuth: Using client ID:', this.config.clientId);
    console.log('NotionOAuth: Environment:', import.meta.env.MODE);
    
    // Validate inputs
    if (!code) {
      throw new Error('Authorization code is required');
    }
    
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Notion OAuth credentials are not configured');
    }
    
    try {
      const requestBody = {
        grant_type: 'authorization_code',
        code: code.trim(), // Remove any whitespace
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      };
      
      console.log('NotionOAuth: Request body:', { 
        ...requestBody, 
        code: '[REDACTED]', 
        client_secret: '[REDACTED]' 
      });
      
      // Always use serverless function to avoid CORS issues
      const apiUrl = '/api/notion-token';
      console.log('NotionOAuth: Using serverless function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('NotionOAuth: Response status:', response.status);
      console.log('NotionOAuth: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('NotionOAuth: Token exchange failed:', errorText);
        
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: 'Unknown error', error_description: errorText };
        }
        
        // Handle specific error cases
        if (error.error === 'invalid_grant') {
          throw new Error('Authorization code expired or already used. Please try connecting again.');
        }
        
        if (error.error === 'invalid_client') {
          throw new Error('Invalid client credentials. Please check your Notion app configuration.');
        }
        
        if (error.error === 'invalid_request') {
          throw new Error('Invalid request. Please try connecting again.');
        }
        
        if (error.error === 'duplicate_request') {
          throw new Error('Connection request already in progress. Please wait and try again.');
        }
        
        throw new Error(error.error_description || error.error || 'Token exchange failed');
      }

      const tokenData = await response.json();
      console.log('NotionOAuth: Token exchange successful');
      
      // Validate the response structure
      if (!tokenData.access_token) {
        throw new Error('Invalid token response: missing access token');
      }
      
      return tokenData;
      
    } catch (error: any) {
      console.error('NotionOAuth: Token exchange error:', error);
      
      // Provide user-friendly error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  }

  // Get user's Notion pages and databases
  async getUserContent(accessToken: string) {
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Notion content');
    }

    return response.json();
  }

  // Get specific page content
  async getPageContent(pageId: string, accessToken: string) {
    const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch page content');
    }

    return response.json();
  }
}

// Get the correct redirect URI based on environment
const getRedirectUri = () => {
  // Always use current origin in browser environment for maximum compatibility
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    const redirectUri = `${currentOrigin}/auth/notion/callback`;
    
    console.log('NotionOAuth Environment Debug:', {
      isDev: import.meta.env.DEV,
      isProd: import.meta.env.PROD,
      mode: import.meta.env.MODE,
      currentOrigin,
      redirectUri,
      devRedirectUri: import.meta.env.VITE_NOTION_REDIRECT_URI,
      prodRedirectUri: import.meta.env.VITE_NOTION_REDIRECT_URI_PROD,
    });
    
    console.log('NotionOAuth: Using dynamic redirect URI:', redirectUri);
    return redirectUri;
  }
  
  // Server-side fallback (shouldn't be used in browser)
  if (import.meta.env.PROD) {
    const prodUri = import.meta.env.VITE_NOTION_REDIRECT_URI_PROD || 'https://nemory.vercel.app/auth/notion/callback';
    console.log('NotionOAuth: Using server-side production URI:', prodUri);
    return prodUri;
  } else {
    const devUri = import.meta.env.VITE_NOTION_REDIRECT_URI || 'http://localhost:8080/auth/notion/callback';
    console.log('NotionOAuth: Using server-side development URI:', devUri);
    return devUri;
  }
};

// Initialize the Notion OAuth service
const redirectUri = getRedirectUri();
console.log('NotionOAuth: Initializing with redirect URI:', redirectUri);

export const notionOAuth = new NotionOAuthService({
  clientId: import.meta.env.VITE_NOTION_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_NOTION_CLIENT_SECRET || '',
  redirectUri: redirectUri,
});