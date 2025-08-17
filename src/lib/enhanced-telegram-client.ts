import RobustErrorHandler from './robust-error-handler';

interface TelegramMessageOptions {
  disableNotification?: boolean;
  protectContent?: boolean;
  replyToMessageId?: number;
  maxRetries?: number;
  timeout?: number;
}

interface TelegramMessage {
  chatId: string;
  summary: string;
  actionItems: Array<{
    text: string;
    priority: string;
    dueDate?: string;
    category: string;
  }>;
  keyInsights: string[];
  priority: string;
  readingTime: number;
  createdAt: string;
}

interface TelegramDeliveryResult {
  success: boolean;
  messageId?: number;
  error?: string;
  retryCount?: number;
  timestamp: string;
}

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

const DEFAULT_OPTIONS: TelegramMessageOptions = {
  disableNotification: false,
  protectContent: true,
  maxRetries: 3,
  timeout: 10000
};

class EnhancedTelegramClient {
  private botToken: string;
  private baseUrl: string;
  private isInitialized: boolean = false;
  private botInfo: TelegramBotInfo | null = null;
  private lastNetworkCheck: number = 0;
  private networkAvailable: boolean = true;

  constructor() {
    this.botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
    this.validateAndInitialize();
  }

  private validateAndInitialize(): void {
    if (!this.botToken) {
      console.error('Telegram bot token not provided');
      return;
    }

    if (!this.botToken.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
      console.error('Invalid Telegram bot token format');
      this.botToken = '';
      return;
    }

    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.isInitialized = true;
    this.initializeBotInfo();
  }

  private async initializeBotInfo(): Promise<void> {
    try {
      this.botInfo = await this.getBotInfo();
    } catch (error) {
      console.error('Failed to initialize bot info:', error);
      this.isInitialized = false;
    }
  }

  private async checkNetworkConnectivity(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastNetworkCheck < 30000) { // Only check every 30 seconds
      return this.networkAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://api.telegram.org', {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      this.networkAvailable = response.ok;
      this.lastNetworkCheck = now;
      return this.networkAvailable;
    } catch (error) {
      this.networkAvailable = false;
      this.lastNetworkCheck = now;
      return false;
    }
  }

  public async validateChatId(chatId: string): Promise<{ isValid: boolean; error?: string }> {
    const basicValidation = RobustErrorHandler.validateChatId(chatId);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    try {
      // Try to get chat information to verify the chat ID is valid
      const response = await RobustErrorHandler.withRetry(async () => {
        const result = await fetch(`${this.baseUrl}/getChat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId.trim() })
        });
        return result.json();
      }, { maxRetries: 2, initialDelay: 1000 });

      if (!response.ok) {
        return {
          isValid: false,
          error: response.description || 'Invalid chat ID'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Could not verify chat ID'
      };
    }
  }

  public async sendMessage(
    chatId: string,
    text: string,
    options: TelegramMessageOptions = {}
  ): Promise<TelegramDeliveryResult> {
    const startTime = Date.now();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    try {
      if (!this.isInitialized) {
        return {
          success: false,
          error: 'Client not properly initialized',
          timestamp: new Date().toISOString()
        };
      }

      if (!await this.checkNetworkConnectivity()) {
        return {
          success: false,
          error: 'Network connectivity issues detected',
          timestamp: new Date().toISOString()
        };
      }

      const validation = await this.validateChatId(chatId);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          timestamp: new Date().toISOString()
        };
      }

      const sanitizedText = RobustErrorHandler.sanitizeForTelegram(text);
      const chunks = this.splitMessage(sanitizedText);

      const results: TelegramDeliveryResult[] = [];
      let retryCount = 0;

      for (const chunk of chunks) {
        const result = await RobustErrorHandler.withRetry(
          async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), mergedOptions.timeout);

            try {
              const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId.trim(),
                  text: chunk,
                  parse_mode: 'MarkdownV2',
                  disable_notification: mergedOptions.disableNotification,
                  protect_content: mergedOptions.protectContent,
                  reply_to_message_id: mergedOptions.replyToMessageId
                }),
                signal: controller.signal
              });

              clearTimeout(timeoutId);
              const data = await response.json();

              if (!response.ok || !data.ok) {
                throw new Error(data.description || 'Failed to send message');
              }

              return {
                success: true,
                messageId: data.result.message_id
              };
            } finally {
              clearTimeout(timeoutId);
            }
          },
          {
            maxRetries: mergedOptions.maxRetries,
            initialDelay: 1000,
            backoffFactor: 2
          }
        );

        retryCount += (result as any).retryCount || 0;
        results.push(result as TelegramDeliveryResult);
      }

      const success = results.every(r => r.success);
      return {
        success,
        messageId: results[0]?.messageId,
        error: success ? undefined : 'Some message chunks failed to send',
        retryCount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      RobustErrorHandler.logError('TelegramMessage', error, {
        chatId,
        textLength: text.length,
        duration: Date.now() - startTime
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  private splitMessage(text: string, maxLength: number = 4096): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let remainingText = text;

    while (remainingText.length > 0) {
      let chunk = remainingText.substring(0, maxLength);
      
      // Find a good splitting point
      const lastNewline = chunk.lastIndexOf('\\n');
      const lastPeriod = chunk.lastIndexOf('\\.');
      const lastSpace = chunk.lastIndexOf(' ');

      let splitPoint = maxLength;
      if (lastNewline > maxLength * 0.8) splitPoint = lastNewline + 2;
      else if (lastPeriod > maxLength * 0.8) splitPoint = lastPeriod + 2;
      else if (lastSpace > maxLength * 0.8) splitPoint = lastSpace + 1;

      chunk = remainingText.substring(0, splitPoint);
      chunks.push(chunk);
      remainingText = remainingText.substring(splitPoint);
    }

    return chunks;
  }

  public async sendSummary(data: TelegramMessage): Promise<TelegramDeliveryResult> {
    try {
      const messageText = await this.formatSummaryForTelegram(data);
      return await this.sendMessage(data.chatId, messageText, {
        disableNotification: false,
        protectContent: true
      });
    } catch (error) {
      RobustErrorHandler.logError('SendSummary', error, {
        chatId: data.chatId,
        summaryLength: data.summary.length
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send summary',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async formatSummaryForTelegram(data: TelegramMessage): Promise<string> {
    return RobustErrorHandler.withRetry(async () => {
      if (!data?.summary) {
        throw new Error('Invalid summary data');
      }

      const validPriorities = ['high', 'medium', 'low'];
      const safePriority = validPriorities.includes(data.priority) ? data.priority : 'medium';
      const priorityEmoji = safePriority === 'high' ? '🔴' : safePriority === 'medium' ? '🟡' : '🟢';

      let message = `🧠 *Nemory AI Summary*\n\n`;
      message += `${priorityEmoji} *Priority:* ${safePriority.toUpperCase()}\n`;
      message += `⏱️ *Reading Time:* ${Math.max(1, Math.min(data.readingTime || 1, 60))} minutes\n\n`;

      // Main summary
      const truncatedSummary = data.summary.length > 2000 ? 
        data.summary.substring(0, 1997) + '...' : 
        data.summary;
      message += `📝 *Summary:*\n${RobustErrorHandler.sanitizeForTelegram(truncatedSummary)}\n\n`;

      // Key insights
      if (Array.isArray(data.keyInsights) && data.keyInsights.length > 0) {
        message += `💡 *Key Insights:*\n`;
        data.keyInsights.slice(0, 5).forEach((insight, index) => {
          if (insight && typeof insight === 'string') {
            const truncatedInsight = insight.length > 200 ? 
              insight.substring(0, 197) + '...' : 
              insight;
            message += `${index + 1}\\. ${RobustErrorHandler.sanitizeForTelegram(truncatedInsight)}\n`;
          }
        });
        message += '\n';
      }

      // Action items
      if (Array.isArray(data.actionItems) && data.actionItems.length > 0) {
        message += `✅ *Action Items:*\n`;
        data.actionItems.slice(0, 10).forEach((item, index) => {
          if (item?.text) {
            const itemPriority = validPriorities.includes(item.priority) ? item.priority : 'medium';
            const priorityIcon = itemPriority === 'high' ? '🔴' : itemPriority === 'medium' ? '🟡' : '🟢';
            
            const truncatedText = item.text.length > 150 ? 
              item.text.substring(0, 147) + '...' : 
              item.text;

            message += `${index + 1}\\. ${priorityIcon} ${RobustErrorHandler.sanitizeForTelegram(truncatedText)}`;
            
            if (item.dueDate) {
              const sanitizedDate = item.dueDate.replace(/[^\d\-\/\s:]/g, '').substring(0, 20);
              message += ` \\(Due: ${RobustErrorHandler.sanitizeForTelegram(sanitizedDate)}\\)`;
            }
            message += '\n';
          }
        });
        message += '\n';
      }

      // Footer
      message += `\\-\\-\\-\n`;
      message += `Generated by Nemory AI 🚀\n`;
      const timestamp = new Date().toLocaleString();
      message += RobustErrorHandler.sanitizeForTelegram(timestamp);

      return message;
    });
  }

  public async sendTestMessage(chatId: string): Promise<TelegramDeliveryResult> {
    const testMessage = `🧠 *Nemory AI Test Message*\n\n` +
      `Hello\\! This is a test message from Nemory AI\\.\n\n` +
      `Your Telegram integration is working correctly\\! 🎉\n\n` +
      `\\-\\-\\-\n` +
      `Generated at ${RobustErrorHandler.sanitizeForTelegram(new Date().toLocaleString())}`;

    return await this.sendMessage(chatId, testMessage, {
      protectContent: false,
      maxRetries: 2
    });
  }

  public async getBotInfo(): Promise<TelegramBotInfo> {
    if (this.botInfo) {
      return this.botInfo;
    }

    return await RobustErrorHandler.withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${this.baseUrl}/getMe`, {
          signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.description || 'Failed to get bot info');
        }

        this.botInfo = data.result;
        return this.botInfo;
      } finally {
        clearTimeout(timeoutId);
      }
    }, {
      maxRetries: 3,
      initialDelay: 1000
    });
  }

  public isConfigured(): boolean {
    return this.isInitialized && !!this.botToken;
  }

  public resetBotInfo(): void {
    this.botInfo = null;
  }
}

export const enhancedTelegramClient = new EnhancedTelegramClient();
export type { TelegramMessage, TelegramDeliveryResult, TelegramMessageOptions, TelegramBotInfo };
