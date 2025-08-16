/**
 * Security Validator
 * Comprehensive input validation and sanitization
 */

export class SecurityValidator {
  /**
   * Validate and sanitize user input
   */
  static sanitizeInput(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .substring(0, maxLength)
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email) && email.length <= 254;

    return {
      isValid,
      error: isValid ? undefined : 'Invalid email format'
    };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user ID format
   */
  static validateUserId(userId: string): { isValid: boolean; error?: string } {
    if (!userId || typeof userId !== 'string') {
      return { isValid: false, error: 'User ID is required' };
    }

    // Firebase Auth UIDs are 28 characters long
    if (userId.length !== 28) {
      return { isValid: false, error: 'Invalid user ID format' };
    }

    // Should only contain alphanumeric characters
    if (!/^[a-zA-Z0-9]+$/.test(userId)) {
      return { isValid: false, error: 'Invalid user ID characters' };
    }

    return { isValid: true };
  }

  /**
   * Validate Telegram chat ID
   */
  static validateTelegramChatId(chatId: string): { isValid: boolean; error?: string } {
    if (!chatId || typeof chatId !== 'string') {
      return { isValid: false, error: 'Chat ID is required' };
    }

    const trimmed = chatId.trim();

    // Validate format: numeric ID or @username
    if (!/^-?\d{1,20}$/.test(trimmed) && !/^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(trimmed)) {
      return { isValid: false, error: 'Invalid Telegram chat ID format' };
    }

    return { isValid: true };
  }

  /**
   * Rate limiting check
   */
  static checkRateLimit(userId: string, action: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    if (typeof window === 'undefined') return true; // Skip on server-side

    const key = `rateLimit_${userId}_${action}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests
    const existingRequests = JSON.parse(localStorage.getItem(key) || '[]') as number[];
    
    // Filter requests within the time window
    const recentRequests = existingRequests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    localStorage.setItem(key, JSON.stringify(recentRequests));

    return true;
  }

  /**
   * Generate secure random string
   */
  static generateSecureId(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(length);
      window.crypto.getRandomValues(array);
      
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      // Fallback for environments without crypto.getRandomValues
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }
}

export default SecurityValidator;