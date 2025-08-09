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
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      owner: 'user',
      redirect_uri: this.config.redirectUri,
    });

    if (state) {
      params.append('state', state);
    }

    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<NotionTokenResponse> {
    console.log('NotionOAuth: Exchanging code for token...');
    console.log('NotionOAuth: Using redirect URI:', this.config.redirectUri);
    console.log('NotionOAuth: Using client ID:', this.config.clientId);
    
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
      };
      
      console.log('NotionOAuth: Request body:', { ...requestBody, code: '[REDACTED]' });
      
      // Try proxy first in development, then direct API
      const urls = import.meta.env.DEV 
        ? ['/api/notion/v1/oauth/token', 'https://api.notion.com/v1/oauth/token']
        : ['https://api.notion.com/v1/oauth/token'];
      
      let lastError: any;
      
      for (const apiUrl of urls) {
        try {
          console.log('NotionOAuth: Trying URL:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`,
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
            
            // If it's an invalid_grant error, don't try other URLs
            if (error.error === 'invalid_grant') {
              throw new Error('Authorization code expired or already used. Please try connecting again.');
            }
            
            // For other errors, try the next URL
            lastError = new Error(`${error.error_description || error.error || 'Unknown error'}`);
            continue;
          }

          const tokenData = await response.json();
          console.log('NotionOAuth: Token exchange successful');
          return tokenData;
          
        } catch (fetchError: any) {
          console.warn('NotionOAuth: Failed with URL:', apiUrl, fetchError.message);
          lastError = fetchError;
          continue;
        }
      }
      
      // If we get here, all URLs failed
      throw lastError || new Error('All token exchange attempts failed');
      
    } catch (error: any) {
      console.error('NotionOAuth: Token exchange error:', error);
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

// Initialize the Notion OAuth service
export const notionOAuth = new NotionOAuthService({
  clientId: import.meta.env.VITE_NOTION_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_NOTION_CLIENT_SECRET || '',
  redirectUri: import.meta.env.VITE_NOTION_REDIRECT_URI || (typeof window !== 'undefined' ? `${window.location.origin}/auth/notion/callback` : ''),
});