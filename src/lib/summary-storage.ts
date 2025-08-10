import { doc, setDoc, getDoc, collection, query, where, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { db, isFirestoreReady } from './firebase';
import { SummaryResult } from './ai-summarization';

export interface SummaryPreferences {
  userId: string;
  style: 'executive' | 'detailed' | 'bullet_points' | 'action_items';
  length: 'short' | 'medium' | 'long';
  focus: string[];
  includeActionItems: boolean;
  includePriority: boolean;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  timeOfDay: string; // HH:MM format
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  updatedAt: string;
}

export interface SummaryDeliveryLog {
  id: string;
  userId: string;
  summaryId: string;
  deliveryMethod: 'email' | 'whatsapp';
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export class SummaryStorageService {
  /**
   * Save a summary to storage
   */
  async saveSummary(summary: SummaryResult): Promise<void> {
    try {
      console.log('SummaryStorage: Saving summary:', summary.id);
      
      // Always save to localStorage for reliability
      const localKey = `summary_${summary.userId}_${summary.id}`;
      localStorage.setItem(localKey, JSON.stringify(summary));
      
      // Try to save to Firestore if available
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'summaries', summary.id);
          await setDoc(docRef, summary);
          console.log('SummaryStorage: Summary saved to Firestore');
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore save failed:', firestoreError.code);
        }
      }
      
      // Update user's summary list
      await this.updateUserSummaryList(summary.userId, summary.id);
      
    } catch (error) {
      console.error('SummaryStorage: Error saving summary:', error);
      throw error;
    }
  }

  /**
   * Get a specific summary by ID
   */
  async getSummary(summaryId: string, userId: string): Promise<SummaryResult | null> {
    try {
      console.log('SummaryStorage: Fetching summary:', summaryId);
      
      // Try Firestore first
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'summaries', summaryId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const summary = docSnap.data() as SummaryResult;
            // Verify user ownership
            if (summary.userId === userId) {
              console.log('SummaryStorage: Summary loaded from Firestore');
              return summary;
            }
          }
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore fetch failed:', firestoreError.code);
        }
      }
      
      // Fallback to localStorage
      const localKey = `summary_${userId}_${summaryId}`;
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        try {
          const summary = JSON.parse(localData) as SummaryResult;
          console.log('SummaryStorage: Summary loaded from localStorage');
          return summary;
        } catch (parseError) {
          console.error('SummaryStorage: Failed to parse localStorage data:', parseError);
        }
      }
      
      console.log('SummaryStorage: Summary not found');
      return null;
      
    } catch (error) {
      console.error('SummaryStorage: Error fetching summary:', error);
      return null;
    }
  }

  /**
   * Get all summaries for a user
   */
  async getUserSummaries(userId: string, limitCount: number = 10): Promise<SummaryResult[]> {
    try {
      console.log('SummaryStorage: Fetching summaries for user:', userId);
      
      // Try Firestore first
      if (isFirestoreReady()) {
        try {
          const q = query(
            collection(db, 'summaries'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
          );
          
          const querySnapshot = await getDocs(q);
          const summaries: SummaryResult[] = [];
          
          querySnapshot.forEach((doc) => {
            summaries.push(doc.data() as SummaryResult);
          });
          
          if (summaries.length > 0) {
            console.log(`SummaryStorage: Loaded ${summaries.length} summaries from Firestore`);
            return summaries;
          }
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore query failed:', firestoreError.code);
        }
      }
      
      // Fallback to localStorage
      const summaries: SummaryResult[] = [];
      const keys = Object.keys(localStorage).filter(key => key.startsWith(`summary_${userId}_`));
      
      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const summary = JSON.parse(data) as SummaryResult;
            summaries.push(summary);
          }
        } catch (parseError) {
          console.warn('SummaryStorage: Failed to parse summary from localStorage:', key);
        }
      }
      
      // Sort by creation date (newest first)
      summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log(`SummaryStorage: Loaded ${summaries.length} summaries from localStorage`);
      return summaries.slice(0, limitCount);
      
    } catch (error) {
      console.error('SummaryStorage: Error fetching user summaries:', error);
      return [];
    }
  }

  /**
   * Delete a summary
   */
  async deleteSummary(summaryId: string, userId: string): Promise<void> {
    try {
      console.log('SummaryStorage: Deleting summary:', summaryId);
      
      // Remove from localStorage
      const localKey = `summary_${userId}_${summaryId}`;
      localStorage.removeItem(localKey);
      
      // Remove from Firestore if available
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'summaries', summaryId);
          await deleteDoc(docRef);
          console.log('SummaryStorage: Summary deleted from Firestore');
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore delete failed:', firestoreError.code);
        }
      }
      
      // Update user's summary list
      await this.removeFromUserSummaryList(userId, summaryId);
      
    } catch (error) {
      console.error('SummaryStorage: Error deleting summary:', error);
      throw error;
    }
  }

  /**
   * Save user preferences for summarization
   */
  async saveUserPreferences(preferences: SummaryPreferences): Promise<void> {
    try {
      console.log('SummaryStorage: Saving user preferences:', preferences.userId);
      
      // Always save to localStorage
      const localKey = `preferences_${preferences.userId}`;
      localStorage.setItem(localKey, JSON.stringify(preferences));
      
      // Try to save to Firestore if available
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'summary_preferences', preferences.userId);
          await setDoc(docRef, preferences);
          console.log('SummaryStorage: Preferences saved to Firestore');
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore preferences save failed:', firestoreError.code);
        }
      }
      
    } catch (error) {
      console.error('SummaryStorage: Error saving preferences:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<SummaryPreferences | null> {
    try {
      console.log('SummaryStorage: Fetching preferences for user:', userId);
      
      // Try Firestore first
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'summary_preferences', userId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const preferences = docSnap.data() as SummaryPreferences;
            console.log('SummaryStorage: Preferences loaded from Firestore');
            return preferences;
          }
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore preferences fetch failed:', firestoreError.code);
        }
      }
      
      // Fallback to localStorage
      const localKey = `preferences_${userId}`;
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        try {
          const preferences = JSON.parse(localData) as SummaryPreferences;
          console.log('SummaryStorage: Preferences loaded from localStorage');
          return preferences;
        } catch (parseError) {
          console.error('SummaryStorage: Failed to parse preferences from localStorage:', parseError);
        }
      }
      
      // Return default preferences if none found
      return this.getDefaultPreferences(userId);
      
    } catch (error) {
      console.error('SummaryStorage: Error fetching preferences:', error);
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Log delivery attempt
   */
  async logDelivery(deliveryLog: SummaryDeliveryLog): Promise<void> {
    try {
      console.log('SummaryStorage: Logging delivery:', deliveryLog.id);
      
      // Save to localStorage
      const localKey = `delivery_${deliveryLog.userId}_${deliveryLog.id}`;
      localStorage.setItem(localKey, JSON.stringify(deliveryLog));
      
      // Try to save to Firestore if available
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'delivery_logs', deliveryLog.id);
          await setDoc(docRef, deliveryLog);
          console.log('SummaryStorage: Delivery log saved to Firestore');
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore delivery log save failed:', firestoreError.code);
        }
      }
      
    } catch (error) {
      console.error('SummaryStorage: Error logging delivery:', error);
    }
  }

  /**
   * Get delivery logs for a summary
   */
  async getDeliveryLogs(summaryId: string, userId: string): Promise<SummaryDeliveryLog[]> {
    try {
      // Try Firestore first
      if (isFirestoreReady()) {
        try {
          const q = query(
            collection(db, 'delivery_logs'),
            where('summaryId', '==', summaryId),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
          );
          
          const querySnapshot = await getDocs(q);
          const logs: SummaryDeliveryLog[] = [];
          
          querySnapshot.forEach((doc) => {
            logs.push(doc.data() as SummaryDeliveryLog);
          });
          
          if (logs.length > 0) {
            return logs;
          }
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore delivery logs query failed:', firestoreError.code);
        }
      }
      
      // Fallback to localStorage
      const logs: SummaryDeliveryLog[] = [];
      const keys = Object.keys(localStorage).filter(key => key.startsWith(`delivery_${userId}_`));
      
      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const log = JSON.parse(data) as SummaryDeliveryLog;
            if (log.summaryId === summaryId) {
              logs.push(log);
            }
          }
        } catch (parseError) {
          console.warn('SummaryStorage: Failed to parse delivery log from localStorage:', key);
        }
      }
      
      // Sort by creation date (newest first)
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return logs;
      
    } catch (error) {
      console.error('SummaryStorage: Error fetching delivery logs:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private async updateUserSummaryList(userId: string, summaryId: string): Promise<void> {
    try {
      const listKey = `summary_list_${userId}`;
      let summaryIds: string[] = [];
      
      const existingList = localStorage.getItem(listKey);
      if (existingList) {
        summaryIds = JSON.parse(existingList);
      }
      
      if (!summaryIds.includes(summaryId)) {
        summaryIds.unshift(summaryId); // Add to beginning
        summaryIds = summaryIds.slice(0, 50); // Keep only latest 50
        localStorage.setItem(listKey, JSON.stringify(summaryIds));
      }
    } catch (error) {
      console.warn('SummaryStorage: Failed to update user summary list:', error);
    }
  }

  private async removeFromUserSummaryList(userId: string, summaryId: string): Promise<void> {
    try {
      const listKey = `summary_list_${userId}`;
      const existingList = localStorage.getItem(listKey);
      
      if (existingList) {
        let summaryIds: string[] = JSON.parse(existingList);
        summaryIds = summaryIds.filter(id => id !== summaryId);
        localStorage.setItem(listKey, JSON.stringify(summaryIds));
      }
    } catch (error) {
      console.warn('SummaryStorage: Failed to remove from user summary list:', error);
    }
  }

  private getDefaultPreferences(userId: string): SummaryPreferences {
    return {
      userId,
      style: 'executive',
      length: 'medium',
      focus: ['tasks', 'ideas', 'decisions'],
      includeActionItems: true,
      includePriority: true,
      frequency: 'weekly',
      timeOfDay: '09:00',
      emailEnabled: true,
      whatsappEnabled: false,
      updatedAt: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const summaryStorageService = new SummaryStorageService();
