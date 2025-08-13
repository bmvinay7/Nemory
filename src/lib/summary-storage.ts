import { doc, setDoc, getDoc, collection, query, where, orderBy, limit, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, isFirestoreReady, handleFirestoreOperation } from './firebase';
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
  private readonly RECYCLE_BIN_DAYS = 30;

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
          
          // Convert date strings to Firestore Timestamps for better querying
          const firestoreSummary = {
            ...summary,
            createdAt: Timestamp.fromDate(new Date(summary.createdAt)),
            deletedAt: summary.deletedAt ? Timestamp.fromDate(new Date(summary.deletedAt)) : null
          };
          
          await handleFirestoreOperation(
            () => setDoc(docRef, firestoreSummary),
            'saveSummary'
          );
          console.log('SummaryStorage: Summary saved to Firestore with Timestamp');
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore save failed:', firestoreError.code);
          if (firestoreError.code === 'permission-denied') {
            console.warn('SummaryStorage: Permission denied - check Firestore rules');
          }
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
   * Get all active (non-deleted) summaries for a user
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
          
          const querySnapshot = await handleFirestoreOperation(
            () => getDocs(q),
            'getUserSummaries query'
          );
          const summaries: SummaryResult[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data() as any;
            if (!data.isDeleted) {
              // Convert Firestore Timestamps back to ISO strings for consistency
              const summary: SummaryResult = {
                ...data,
                createdAt: data.createdAt instanceof Timestamp 
                  ? data.createdAt.toDate().toISOString() 
                  : data.createdAt,
                deletedAt: data.deletedAt instanceof Timestamp 
                  ? data.deletedAt.toDate().toISOString() 
                  : data.deletedAt
              };
              summaries.push(summary);
            }
          });
          
          if (summaries.length > 0) {
            console.log(`SummaryStorage: Loaded ${summaries.length} summaries from Firestore`);
            return summaries;
          }
        } catch (firestoreError: any) {
          console.error('SummaryStorage: Firestore query failed:', {
            code: firestoreError.code,
            message: firestoreError.message,
            userId: userId,
            isFirestoreReady: isFirestoreReady()
          });
          
          // If it's a missing index error, provide helpful information
          if (firestoreError.code === 'failed-precondition' && firestoreError.message.includes('index')) {
            console.error('SummaryStorage: Missing Firestore index! Run: firebase deploy --only firestore:indexes');
          }
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
            // Only include non-deleted summaries
            if (!summary.isDeleted) {
              summaries.push(summary);
            }
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
   * Move summary to recycle bin (soft delete)
   */
  async deleteSummary(summaryId: string, userId: string): Promise<void> {
    try {
      console.log('SummaryStorage: Moving summary to recycle bin:', summaryId);
      
      // Get the current summary
      const summary = await this.getSummary(summaryId, userId);
      if (!summary) {
        throw new Error('Summary not found');
      }
      
      // Mark as deleted
      const deletedSummary: SummaryResult = {
        ...summary,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userId
      };
      
      // Update in localStorage
      const localKey = `summary_${userId}_${summaryId}`;
      localStorage.setItem(localKey, JSON.stringify(deletedSummary));
      
      // Update in Firestore if available
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'summaries', summaryId);
          await setDoc(docRef, deletedSummary);
          console.log('SummaryStorage: Summary moved to recycle bin in Firestore');
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore recycle bin update failed:', firestoreError.code);
        }
      }
      
    } catch (error) {
      console.error('SummaryStorage: Error moving summary to recycle bin:', error);
      throw error;
    }
  }

  /**
   * Get deleted summaries (recycle bin)
   */
  async getDeletedSummaries(userId: string): Promise<SummaryResult[]> {
    try {
      console.log('SummaryStorage: Fetching deleted summaries for user:', userId);
      
      // Try Firestore first
      if (isFirestoreReady()) {
        try {
          const q = query(
            collection(db, 'summaries'),
            where('userId', '==', userId),
            where('isDeleted', '==', true),
            orderBy('deletedAt', 'desc')
          );
          
          const querySnapshot = await getDocs(q);
          const summaries: SummaryResult[] = [];
          
          querySnapshot.forEach((doc) => {
            const summary = doc.data() as SummaryResult;
            // Check if not expired (30 days)
            if (this.isWithinRecycleBinPeriod(summary.deletedAt!)) {
              summaries.push(summary);
            }
          });
          
          if (summaries.length > 0) {
            console.log(`SummaryStorage: Loaded ${summaries.length} deleted summaries from Firestore`);
            return summaries;
          }
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore deleted summaries query failed:', firestoreError.code);
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
            if (summary.isDeleted && this.isWithinRecycleBinPeriod(summary.deletedAt!)) {
              summaries.push(summary);
            }
          }
        } catch (parseError) {
          console.warn('SummaryStorage: Failed to parse deleted summary from localStorage:', key);
        }
      }
      
      // Sort by deletion date (newest first)
      summaries.sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
      
      console.log(`SummaryStorage: Loaded ${summaries.length} deleted summaries from localStorage`);
      return summaries;
      
    } catch (error) {
      console.error('SummaryStorage: Error fetching deleted summaries:', error);
      return [];
    }
  }

  /**
   * Restore summary from recycle bin
   */
  async restoreSummary(summaryId: string, userId: string): Promise<void> {
    try {
      console.log('SummaryStorage: Restoring summary from recycle bin:', summaryId);
      
      // Get the deleted summary
      const summary = await this.getSummary(summaryId, userId);
      if (!summary || !summary.isDeleted) {
        throw new Error('Summary not found in recycle bin');
      }
      
      // Check if still within restore period
      if (!this.isWithinRecycleBinPeriod(summary.deletedAt!)) {
        throw new Error('Summary has expired and cannot be restored');
      }
      
      // Remove deletion markers
      const restoredSummary: SummaryResult = {
        ...summary,
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined
      };
      
      // Update in localStorage
      const localKey = `summary_${userId}_${summaryId}`;
      localStorage.setItem(localKey, JSON.stringify(restoredSummary));
      
      // Update in Firestore if available
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'summaries', summaryId);
          await setDoc(docRef, restoredSummary);
          console.log('SummaryStorage: Summary restored in Firestore');
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore restore failed:', firestoreError.code);
        }
      }
      
      // Add back to user's summary list
      await this.updateUserSummaryList(userId, summaryId);
      
    } catch (error) {
      console.error('SummaryStorage: Error restoring summary:', error);
      throw error;
    }
  }

  /**
   * Permanently delete summary (cannot be undone)
   */
  async permanentlyDeleteSummary(summaryId: string, userId: string): Promise<void> {
    try {
      console.log('SummaryStorage: Permanently deleting summary:', summaryId);
      
      // Remove from localStorage
      const localKey = `summary_${userId}_${summaryId}`;
      localStorage.removeItem(localKey);
      
      // Remove from Firestore if available
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'summaries', summaryId);
          await deleteDoc(docRef);
          console.log('SummaryStorage: Summary permanently deleted from Firestore');
        } catch (firestoreError: any) {
          console.warn('SummaryStorage: Firestore permanent delete failed:', firestoreError.code);
        }
      }
      
      // Remove from user's summary list
      await this.removeFromUserSummaryList(userId, summaryId);
      
    } catch (error) {
      console.error('SummaryStorage: Error permanently deleting summary:', error);
      throw error;
    }
  }

  /**
   * Clean up expired summaries from recycle bin
   */
  async cleanupExpiredSummaries(userId: string): Promise<number> {
    try {
      console.log('SummaryStorage: Cleaning up expired summaries for user:', userId);
      
      const deletedSummaries = await this.getDeletedSummaries(userId);
      let cleanedCount = 0;
      
      for (const summary of deletedSummaries) {
        if (!this.isWithinRecycleBinPeriod(summary.deletedAt!)) {
          await this.permanentlyDeleteSummary(summary.id, userId);
          cleanedCount++;
        }
      }
      
      console.log(`SummaryStorage: Cleaned up ${cleanedCount} expired summaries`);
      return cleanedCount;
      
    } catch (error) {
      console.error('SummaryStorage: Error cleaning up expired summaries:', error);
      return 0;
    }
  }

  /**
   * Check if summary is within recycle bin period (30 days)
   */
  private isWithinRecycleBinPeriod(deletedAt: string): boolean {
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= this.RECYCLE_BIN_DAYS;
  }

  /**
   * Get days remaining before permanent deletion
   */
  getDaysUntilPermanentDeletion(deletedAt: string): number {
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const daysPassed = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, this.RECYCLE_BIN_DAYS - Math.floor(daysPassed));
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
