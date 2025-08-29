/**
 * Robust Error Handler
 * Provides comprehensive error handling and data sanitization
 */

export class RobustErrorHandler {
  /**
   * Clean object for Firestore by removing undefined values recursively
   */
  static cleanForFirestore(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj
        .filter(item => item !== undefined)
        .map(item => this.cleanForFirestore(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanForFirestore(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Sanitize text for Telegram MarkdownV2
   */
  static sanitizeForTelegram(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    // Remove control characters and limit length
    const sanitized = text
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .substring(0, 4000);
    
    // Escape MarkdownV2 special characters
    return sanitized.replace(/[_*\[\]()~`>#+\-=|{}\.!\\]/g, '\\$&');
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
   * Safe async operation with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
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
   * Log error with context
   */
  static logError(context: string, error: any, additionalData?: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`🚨 ${context}:`, {
      message: errorMessage,
      stack: errorStack,
      additionalData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create safe error response
   */
  static createErrorResponse(message: string, code?: string): { success: false; error: string; code?: string } {
    return {
      success: false,
      error: message.substring(0, 500), // Limit error message length
      ...(code && { code })
    };
  }

  /**
   * Validate environment variables
   */
  static validateEnvironment(): { isValid: boolean; missing: string[] } {
    const required = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ];

    const missing = required.filter(key => !import.meta.env[key]);

    return {
      isValid: missing.length === 0,
      missing
    };
  }
}

export default RobustErrorHandler;