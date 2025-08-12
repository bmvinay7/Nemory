interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

class TelegramWebhookService {
  private botToken: string;
  private baseUrl: string;

  constructor() {
    this.botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Handle incoming webhook from Telegram
   */
  async handleWebhook(update: TelegramUpdate): Promise<void> {
    try {
      if (!update.message || !update.message.text) {
        return;
      }

      const message = update.message;
      const chatId = message.chat.id.toString();
      const text = message.text.toLowerCase().trim();
      const userName = message.from.first_name || 'there';

      // Auto-respond with chat ID for any message
      let responseText = '';

      if (text === '/start' || text.includes('hello') || text.includes('hi') || text === '/help') {
        responseText = `👋 Hello ${userName}\\!\n\n` +
          `Welcome to Nemory AI Bot\\! 🧠\n\n` +
          `Your Chat ID is: \`${chatId}\`\n\n` +
          `📋 *How to use:*\n` +
          `1\\. Copy your Chat ID above\n` +
          `2\\. Go to Nemory settings\n` +
          `3\\. Paste your Chat ID\n` +
          `4\\. Click Save and Send Test\n\n` +
          `Once configured, you'll receive AI summaries of your Notion notes here\\! 🚀`;
      } else {
        // For any other message, just provide the chat ID
        responseText = `🤖 *Nemory AI Bot*\n\n` +
          `Your Chat ID is: \`${chatId}\`\n\n` +
          `Copy this ID and paste it in your Nemory settings to receive AI summaries\\! 📝`;
      }

      // Send response
      await this.sendMessage(chatId, responseText);

    } catch (error) {
      console.error('Error handling webhook:', error);
    }
  }

  /**
   * Send message via Telegram Bot API
   */
  private async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'MarkdownV2'
        }),
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  /**
   * Set webhook URL (call this once to configure the bot)
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message']
        }),
      });

      const result = await response.json();
      return result.ok;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return false;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/getWebhookInfo`);
      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('Error getting webhook info:', error);
      return null;
    }
  }

  /**
   * Delete webhook (for testing with polling)
   */
  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
        method: 'POST'
      });
      const result = await response.json();
      return result.ok;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return false;
    }
  }
}

export const telegramWebhookService = new TelegramWebhookService();
export type { TelegramUpdate };