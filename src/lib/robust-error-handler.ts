/**
 * Robust Error Handler
 * Provides comprehensive error handling and data sanitization
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
}

interface ValidationResult<T> {
  isValid: boolean;
  sanitized?: T;
  errors: string[];
  warnings?: string[];
}

export class RobustErrorHandler {
  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    timeout: 30000
  };

  /**
   * Clean object for Firestore by removing undefined values recursively
   */
  static cleanForFirestore(obj: any): any {
    try {
      if (obj === null || obj === undefined) {
        return null;
      }

      if (Array.isArray(obj)) {
        return obj
          .filter(item => item !== undefined && item !== null)
          .map(item => this.cleanForFirestore(item));
      }

      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined && value !== null) {
            cleaned[key] = this.cleanForFirestore(value);
          }
        }
        return cleaned;
      }

      return obj;
    } catch (error) {
      this.logError('cleanForFirestore', error);
      return null;
    }
  }

  /**
   * Sanitize text for Telegram MarkdownV2 with enhanced error handling
   */
  static sanitizeForTelegram(text: string): string {
    try {
      if (!text || typeof text !== 'string') return '';
      
      // Remove control characters and limit length
      let sanitized = text
        .replace(/[\x00-\x1F\x7F]/g, '')
        .substring(0, 4000);
      
      // Normalize line endings
      sanitized = sanitized.replace(/\r\n?/g, '\n');
      
      // First escape the backslash itself
      let escaped = sanitized.replace(/\\/g, '\\\\');
      
      // Then escape all other special characters
      const specialChars = '_*[]()~`>#+=-|{}.!';
      for (const char of specialChars) {
        escaped = escaped.replace(new RegExp('\\' + char, 'g'), '\\' + char);
      }
      
      // Validate the escaped string
      const invalidChars = escaped.match(/[_*\[\]()~`>#+\-=|{}.!]/g);
      if (invalidChars) {
        this.logError('sanitizeForTelegram', 
          new Error(`Found unescaped characters: ${invalidChars.join(', ')}`));
        // Re-escape any missed characters
        for (const char of invalidChars) {
          escaped = escaped.replace(new RegExp('\\' + char, 'g'), '\\' + char);
        }
      }
      
      // Ensure proper line breaks for Telegram
      escaped = escaped.replace(/\n/g, '\\n');
      
      return escaped;
    } catch (error) {
      this.logError('sanitizeForTelegram', error);
      // Return a safely escaped version of the original text
      return text.replace(/[^a-zA-Z0-9\s]/g, '');
    }
  }

  /**
   * Validate and sanitize chat ID
   */
  static validateChatId(chatId: string): { isValid: boolean; sanitized?: string; error?: string } {
    if (!chatId || typeof chatId !== 'string') {
      return { isValid: false, error: 'Chat ID is required' };
    }

    const trimmed = chatId.trim();
    
    // Validate format
    if (!/^-?\d{1,20}$/.test(trimmed) && !/^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(trimmed)) {
      return { isValid: false, error: 'Invalid chat ID format' };
    }

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Safe JSON parse with error handling
   */
  static safeJsonParse<T>(jsonString: string, fallback: T): T {
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Enhanced async operation with advanced retry logic and timeout
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = this.DEFAULT_RETRY_OPTIONS.maxRetries,
      initialDelay = this.DEFAULT_RETRY_OPTIONS.initialDelay,
      maxDelay = this.DEFAULT_RETRY_OPTIONS.maxDelay,
      backoffFactor = this.DEFAULT_RETRY_OPTIONS.backoffFactor,
      timeout = this.DEFAULT_RETRY_OPTIONS.timeout
    } = options;

    let lastError: Error;
    let startTime = Date.now();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeout) {
          throw new Error(`Operation timed out after ${timeout}ms`);
        }

        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Attempt ${attempt} timed out after ${timeout}ms`));
          }, timeout);
        });

        // Race between the operation and timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Log the error with attempt information
        this.logError('withRetry', lastError, {
          attempt,
          maxRetries,
          timeElapsed: Date.now() - startTime
        });
        
        if (attempt === maxRetries) {
          throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          initialDelay * Math.pow(backoffFactor, attempt - 1) * (0.75 + Math.random() * 0.5),
          maxDelay
        );

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Validate and sanitize execution data
   */
  static validateExecutionData(execution: any): { isValid: boolean; sanitized?: any; errors: string[] } {
    const errors: string[] = [];
    const sanitized: any = {};

    // Required fields
    if (!execution.id || typeof execution.id !== 'string') {
      errors.push('Invalid execution ID');
    } else {
      sanitized.id = execution.id.trim();
    }

    if (!execution.scheduleId || typeof execution.scheduleId !== 'string') {
      errors.push('Invalid schedule ID');
    } else {
      sanitized.scheduleId = execution.scheduleId.trim();
    }

    if (!execution.userId || typeof execution.userId !== 'string') {
      errors.push('Invalid user ID');
    } else {
      sanitized.userId = execution.userId.trim();
    }

    if (!execution.executedAt || typeof execution.executedAt !== 'string') {
      errors.push('Invalid execution date');
    } else {
      sanitized.executedAt = execution.executedAt;
    }

    // Optional fields with defaults
    sanitized.status = ['success', 'failed', 'partial'].includes(execution.status) 
      ? execution.status 
      : 'failed';

    sanitized.contentProcessed = typeof execution.contentProcessed === 'number' 
      ? Math.max(0, execution.contentProcessed) 
      : 0;

    sanitized.executionTime = typeof execution.executionTime === 'number' 
      ? Math.max(0, execution.executionTime) 
      : 0;

    // Clean delivery results
    sanitized.deliveryResults = {};
    if (execution.deliveryResults && typeof execution.deliveryResults === 'object') {
      for (const [method, result] of Object.entries(execution.deliveryResults)) {
        if (result && typeof result === 'object') {
          sanitized.deliveryResults[method] = this.cleanForFirestore(result);
        }
      }
    }

    // Optional fields
    if (execution.summaryId && typeof execution.summaryId === 'string') {
      sanitized.summaryId = execution.summaryId.trim();
    }

    if (execution.error && typeof execution.error === 'string') {
      sanitized.error = execution.error.substring(0, 1000); // Limit error message length
    }

    return {
      isValid: errors.length === 0,
      sanitized: errors.length === 0 ? sanitized : undefined,
      errors
    };
  }

  /**
   * Enhanced error logging with detailed context and error categorization
   */
  static logError(context: string, error: any, additionalData?: any): void {
    // Ensure error is properly formatted
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Extract error details
    const errorDetails = {
      message: errorObj.message,
      name: errorObj.name,
      stack: errorObj.stack,
      code: (error as any).code, // Capture error codes from API errors
      status: (error as any).status, // Capture HTTP status codes
      type: this.categorizeError(error),
      timestamp: new Date().toISOString(),
      context,
      additionalData
    };

    // Log to console with proper formatting
    console.error('🚨 Error:', {
      ...errorDetails,
      // Clean undefined values
      ...this.cleanForFirestore(additionalData)
    });

    // If in development, provide more detailed logging
    if (import.meta.env.DEV) {
      console.error('Detailed Error Stack:');
      console.error(errorObj.stack);
    }

    // Log specific error types
    if (this.isNetworkError(error)) {
      console.error('📡 Network Error - Check connectivity');
    } else if (this.isTimeoutError(error)) {
      console.error('⏱️ Timeout Error - Operation took too long');
    } else if (this.isAuthenticationError(error)) {
      console.error('🔒 Authentication Error - Check credentials');
    }
  }

  /**
   * Categorize error types for better error handling
   */
  private static categorizeError(error: any): string {
    if (error instanceof TypeError) return 'TypeError';
    if (this.isNetworkError(error)) return 'NetworkError';
    if (this.isTimeoutError(error)) return 'TimeoutError';
    if (this.isAuthenticationError(error)) return 'AuthenticationError';
    if ((error as any).code?.startsWith('firestore/')) return 'FirestoreError';
    return 'UnknownError';
  }

  /**
   * Check if error is a network error
   */
  private static isNetworkError(error: any): boolean {
    return (
      error instanceof TypeError &&
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.name === 'NetworkError'
    );
  }

  /**
   * Check if error is a timeout error
   */
  private static isTimeoutError(error: any): boolean {
    return (
      error.message.includes('timeout') ||
      error.code === 'ETIMEDOUT' ||
      error.name === 'TimeoutError'
    );
  }

  /**
   * Check if error is an authentication error
   */
  private static isAuthenticationError(error: any): boolean {
    return (
      error.message.includes('auth') ||
      error.message.includes('unauthorized') ||
      error.message.includes('unauthenticated') ||
      error.code === 401 ||
      error.status === 401 ||
      (error as any).code?.startsWith('auth/')
    );
  }

  /**
   * Create standardized error response with enhanced details
   */
  static createErrorResponse(
    message: string,
    options: {
      code?: string;
      status?: number;
      details?: any;
      suggestion?: string;
      retryable?: boolean;
    } = {}
  ): {
    success: false;
    error: string;
    code?: string;
    status?: number;
    timestamp: string;
    details?: any;
    suggestion?: string;
    retryable: boolean;
  } {
    const {
      code,
      status,
      details,
      suggestion,
      retryable = false
    } = options;

    // Sanitize and truncate error message
    const sanitizedMessage = message
      .replace(/[^\w\s.,!?-]/g, '')  // Remove potentially harmful characters
      .substring(0, 500);             // Limit length

    // Sanitize details to prevent sensitive data leakage
    const sanitizedDetails = details ? this.cleanForFirestore(details) : undefined;

    return {
      success: false,
      error: sanitizedMessage,
      ...(code && { code }),
      ...(status && { status }),
      timestamp: new Date().toISOString(),
      ...(sanitizedDetails && { details: sanitizedDetails }),
      ...(suggestion && { suggestion }),
      retryable
    };
  }

  /**
   * Comprehensive environment validation with format checking
   */
  static validateEnvironment(): ValidationResult<Record<string, string>> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: Record<string, string> = {};

    // Required environment variables with validation rules
    const envVars = {
      VITE_FIREBASE_API_KEY: {
        required: true,
        format: /^AIza[A-Za-z0-9_-]{32}$/,
        message: 'Must be a valid Firebase API key'
      },
      VITE_FIREBASE_AUTH_DOMAIN: {
        required: true,
        format: /^[a-z0-9-]+\.firebaseapp\.com$/,
        message: 'Must be a valid Firebase Auth domain'
      },
      VITE_FIREBASE_PROJECT_ID: {
        required: true,
        format: /^[a-z0-9-]+$/,
        message: 'Must contain only lowercase letters, numbers, and hyphens'
      },
      VITE_FIREBASE_STORAGE_BUCKET: {
        required: true,
        format: /^[a-z0-9-]+\.appspot\.com$/,
        message: 'Must be a valid Firebase Storage bucket'
      },
      VITE_FIREBASE_MESSAGING_SENDER_ID: {
        required: true,
        format: /^\d+$/,
        message: 'Must be a numeric sender ID'
      },
      VITE_FIREBASE_APP_ID: {
        required: true,
        format: /^[0-9:]+$/,
        message: 'Must be a valid Firebase App ID'
      },
      VITE_TELEGRAM_BOT_TOKEN: {
        required: true,
        format: /^\d+:[A-Za-z0-9_-]{35}$/,
        message: 'Must be a valid Telegram bot token'
      },
      VITE_NOTION_CLIENT_ID: {
        required: true,
        format: /^[a-f0-9-]{36}$/,
        message: 'Must be a valid Notion client ID'
      }
    };

    // Validate each environment variable
    for (const [key, config] of Object.entries(envVars)) {
      const value = import.meta.env[key];

      if (!value && config.required) {
        errors.push(`Missing required environment variable: ${key}`);
        continue;
      }

      if (value && config.format && !config.format.test(value)) {
        errors.push(`Invalid ${key}: ${config.message}`);
        continue;
      }

      if (value) {
        sanitized[key] = value;
      }
    }

    // Check for development-specific variables
    if (import.meta.env.DEV) {
      if (!import.meta.env.VITE_USE_FIRESTORE_EMULATOR) {
        warnings.push('Development environment detected but VITE_USE_FIRESTORE_EMULATOR not set');
      }
    }

    // Validate production-specific requirements
    if (import.meta.env.PROD) {
      if (!import.meta.env.VITE_SENTRY_DSN) {
        warnings.push('Production environment detected but VITE_SENTRY_DSN not configured');
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized: errors.length === 0 ? sanitized : undefined,
      errors,
      warnings
    };
  }
}

export default RobustErrorHandler;