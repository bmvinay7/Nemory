/**
 * Environment variable validation and security checks
 */

interface EnvConfig {
  VITE_GOOGLE_AI_API_KEY?: string;
  VITE_TELEGRAM_BOT_TOKEN?: string;
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_NOTION_CLIENT_ID?: string;
  VITE_NOTION_CLIENT_SECRET?: string;
  VITE_NOTION_REDIRECT_URI?: string;
}

class EnvironmentValidator {
  private config: EnvConfig;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    this.config = import.meta.env as EnvConfig;
    this.validateEnvironment();
  }

  private validateEnvironment(): void {
    this.validateGoogleAI();
    this.validateTelegram();
    this.validateFirebase();
    this.validateNotion();
    this.validateGeneral();
  }

  private validateGoogleAI(): void {
    const apiKey = this.config.VITE_GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      this.warnings.push('Google AI API key not configured - AI features will be disabled');
      return;
    }

    if (typeof apiKey !== 'string' || apiKey.length < 20) {
      this.errors.push('Invalid Google AI API key format');
      return;
    }

    if (!apiKey.startsWith('AIza')) {
      this.errors.push('Google AI API key should start with "AIza"');
    }

    if (apiKey.includes(' ') || apiKey.includes('\n') || apiKey.includes('\t')) {
      this.errors.push('Google AI API key contains invalid characters');
    }
  }

  private validateTelegram(): void {
    const botToken = this.config.VITE_TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      this.warnings.push('Telegram bot token not configured - Telegram features will be disabled');
      return;
    }

    if (typeof botToken !== 'string') {
      this.errors.push('Invalid Telegram bot token type');
      return;
    }

    // Telegram bot token format: {bot_id}:{bot_token}
    const tokenPattern = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;
    if (!tokenPattern.test(botToken)) {
      this.errors.push('Invalid Telegram bot token format');
    }

    // Check for common test/placeholder tokens
    if (botToken.includes('YOUR_BOT_TOKEN') || botToken.includes('test') || botToken.includes('example')) {
      this.errors.push('Telegram bot token appears to be a placeholder');
    }
  }

  private validateFirebase(): void {
    const requiredFields = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ];

    const missingFields = requiredFields.filter(field => !this.config[field as keyof EnvConfig]);
    
    if (missingFields.length > 0) {
      this.errors.push(`Missing Firebase configuration: ${missingFields.join(', ')}`);
      return;
    }

    // Validate Firebase API key format
    const apiKey = this.config.VITE_FIREBASE_API_KEY;
    if (apiKey && !apiKey.startsWith('AIza')) {
      this.errors.push('Invalid Firebase API key format');
    }

    // Validate project ID format
    const projectId = this.config.VITE_FIREBASE_PROJECT_ID;
    if (projectId && !/^[a-z0-9-]+$/.test(projectId)) {
      this.errors.push('Invalid Firebase project ID format');
    }

    // Validate auth domain
    const authDomain = this.config.VITE_FIREBASE_AUTH_DOMAIN;
    if (authDomain && !authDomain.endsWith('.firebaseapp.com')) {
      this.errors.push('Invalid Firebase auth domain format');
    }
  }

  private validateNotion(): void {
    const clientId = this.config.VITE_NOTION_CLIENT_ID;
    const clientSecret = this.config.VITE_NOTION_CLIENT_SECRET;
    const redirectUri = this.config.VITE_NOTION_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      this.warnings.push('Notion OAuth not fully configured - Notion integration will be disabled');
      return;
    }

    // Validate client ID format (UUID-like)
    if (!/^[a-f0-9-]{36}$/.test(clientId)) {
      this.errors.push('Invalid Notion client ID format');
    }

    // Validate redirect URI format
    if (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
      this.errors.push('Invalid Notion redirect URI format');
    }

    // Check for localhost in production
    if (import.meta.env.PROD && redirectUri.includes('localhost')) {
      this.errors.push('Localhost redirect URI detected in production');
    }
  }

  private validateGeneral(): void {
    // Check for development settings in production
    if (import.meta.env.PROD) {
      const devIndicators = [
        'localhost',
        'test',
        'dev',
        'debug',
        'example'
      ];

      Object.entries(this.config).forEach(([key, value]) => {
        if (typeof value === 'string') {
          devIndicators.forEach(indicator => {
            if (value.toLowerCase().includes(indicator)) {
              this.warnings.push(`${key} contains development indicator: ${indicator}`);
            }
          });
        }
      });
    }

    // Check for empty or placeholder values
    Object.entries(this.config).forEach(([key, value]) => {
      if (typeof value === 'string') {
        if (value.includes('your_') || value.includes('YOUR_') || value.includes('placeholder')) {
          this.errors.push(`${key} appears to be a placeholder value`);
        }
      }
    });
  }

  public getValidationResults(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  public logResults(): void {
    const results = this.getValidationResults();
    
    // Only log in development mode
    if (import.meta.env.DEV) {
      if (results.errors.length > 0) {
        console.error('❌ Environment validation errors:');
        results.errors.forEach(error => console.error(`   - ${error}`));
      }

      if (results.warnings.length > 0) {
        console.warn('⚠️ Environment validation warnings:');
        results.warnings.forEach(warning => console.warn(`   - ${warning}`));
      }

      if (results.isValid && results.warnings.length === 0) {
        console.log('✅ Environment validation passed');
      }
    }
  }
}

// Create and export validator instance
export const envValidator = new EnvironmentValidator();

// Auto-validate on import in development
if (import.meta.env.DEV) {
  envValidator.logResults();
}

export default envValidator;