import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface TelegramPreferences {
  chatId: string;
  isVerified: boolean;
  botUsername?: string;
  lastTestSent?: string;
  createdAt: string;
  updatedAt: string;
}

export class TelegramPreferencesService {
  /**
   * Get user's Telegram preferences
   */
  async getUserPreferences(userId: string): Promise<TelegramPreferences | null> {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new Error('Invalid userId provided to getUserPreferences');
      }
      
      console.log('TelegramPreferences: Loading preferences for user:', userId);
      
      const prefsRef = doc(db, 'telegramPreferences', userId.trim());
      const prefsSnap = await getDoc(prefsRef);

      if (prefsSnap.exists()) {
        const data = prefsSnap.data() as TelegramPreferences;
        console.log('TelegramPreferences: Loaded preferences:', { 
          hasChatId: !!data.chatId, 
          isVerified: data.isVerified 
        });
        return data;
      } else {
        console.log('TelegramPreferences: No preferences found');
        return null;
      }
    } catch (error) {
      console.error('TelegramPreferences: Error loading preferences:', error);
      return null;
    }
  }

  /**
   * Get verified chat ID for a user
   */
  async getVerifiedChatId(userId: string): Promise<string | null> {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new Error('Invalid userId provided to getVerifiedChatId');
      }
      
      const preferences = await this.getUserPreferences(userId);
      
      if (preferences && preferences.isVerified && preferences.chatId) {
        return preferences.chatId;
      }
      
      return null;
    } catch (error) {
      console.error('TelegramPreferences: Error getting verified chat ID:', error);
      return null;
    }
  }

  /**
   * Check if user has verified Telegram setup
   */
  async hasVerifiedTelegram(userId: string): Promise<boolean> {
    try {
      const chatId = await this.getVerifiedChatId(userId);
      return !!chatId;
    } catch (error) {
      console.error('TelegramPreferences: Error checking verified status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const telegramPreferencesService = new TelegramPreferencesService();