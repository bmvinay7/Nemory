import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export class FirestoreIndexChecker {
  /**
   * Check if the schedules index is ready
   */
  async checkSchedulesIndex(userId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'schedules'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      await getDocs(q);
      return true;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'failed-precondition') {
        return false;
      }
      // Other errors might be network issues, so we assume index is ready
      return true;
    }
  }

  /**
   * Check if the schedule executions index is ready
   */
  async checkExecutionsIndex(userId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'schedule_executions'),
        where('userId', '==', userId),
        orderBy('executedAt', 'desc'),
        limit(1)
      );

      await getDocs(q);
      return true;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'failed-precondition') {
        return false;
      }
      return true;
    }
  }

  /**
   * Check if all required indexes are ready
   */
  async checkAllIndexes(userId: string): Promise<{
    schedulesReady: boolean;
    executionsReady: boolean;
    allReady: boolean;
  }> {
    const [schedulesReady, executionsReady] = await Promise.all([
      this.checkSchedulesIndex(userId),
      this.checkExecutionsIndex(userId)
    ]);

    return {
      schedulesReady,
      executionsReady,
      allReady: schedulesReady && executionsReady
    };
  }

  /**
   * Wait for indexes to be ready (with timeout)
   */
  async waitForIndexes(userId: string, timeoutMs: number = 300000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.checkAllIndexes(userId);
      
      if (status.allReady) {
        console.log('✅ All Firestore indexes are ready');
        return true;
      }

      console.log('⏳ Waiting for Firestore indexes to build...', {
        schedulesReady: status.schedulesReady,
        executionsReady: status.executionsReady
      });

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.warn('⚠️ Timeout waiting for Firestore indexes');
    return false;
  }
}

// Export singleton instance
export const firestoreIndexChecker = new FirestoreIndexChecker();