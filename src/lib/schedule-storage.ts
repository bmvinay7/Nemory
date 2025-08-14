import { doc, setDoc, getDoc, collection, query, where, orderBy, limit, getDocs, deleteDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db, handleFirestoreOperation } from './firebase';
import { ScheduleConfig, ScheduleExecution, ScheduleStats } from './schedule-types';
import RobustErrorHandler from './robust-error-handler';

export class ScheduleStorageService {
  private readonly COLLECTION_SCHEDULES = 'schedules';
  private readonly COLLECTION_EXECUTIONS = 'schedule_executions';

  /**
   * Save a schedule configuration
   */
  async saveSchedule(schedule: ScheduleConfig): Promise<void> {
    try {
      console.log('ScheduleStorage: Saving schedule:', schedule.id);

      // Validate schedule
      this.validateSchedule(schedule);

      // Calculate next run time
      const nextRun = this.calculateNextRun(schedule);
      const scheduleWithNextRun = {
        ...schedule,
        nextRun: nextRun.toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to localStorage for offline access
      const localKey = `schedule_${schedule.userId}_${schedule.id}`;
      localStorage.setItem(localKey, JSON.stringify(scheduleWithNextRun));

      // Save to Firestore
      const docRef = doc(db, this.COLLECTION_SCHEDULES, schedule.id);
      
      // Clean the schedule data to remove undefined values (Firestore doesn't support them)
      const cleanedSchedule = this.cleanScheduleForFirestore(scheduleWithNextRun);
      
      const firestoreSchedule = {
        ...cleanedSchedule,
        createdAt: Timestamp.fromDate(new Date(scheduleWithNextRun.createdAt)),
        updatedAt: Timestamp.fromDate(new Date(scheduleWithNextRun.updatedAt)),
        nextRun: Timestamp.fromDate(nextRun),
        lastRun: scheduleWithNextRun.lastRun ? Timestamp.fromDate(new Date(scheduleWithNextRun.lastRun)) : null
      };

      await handleFirestoreOperation(
        () => setDoc(docRef, firestoreSchedule),
        'saveSchedule'
      );

      console.log('ScheduleStorage: Schedule saved successfully');
    } catch (error) {
      console.error('ScheduleStorage: Error saving schedule:', error);
      throw error;
    }
  }

  /**
   * Get a specific schedule by ID
   */
  async getSchedule(scheduleId: string, userId: string): Promise<ScheduleConfig | null> {
    try {
      // Try Firestore first
      const docRef = doc(db, this.COLLECTION_SCHEDULES, scheduleId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.userId === userId) {
          return this.convertFirestoreToSchedule(data);
        }
      }

      // Fallback to localStorage
      const localKey = `schedule_${userId}_${scheduleId}`;
      const localData = localStorage.getItem(localKey);
      if (localData) {
        return JSON.parse(localData) as ScheduleConfig;
      }

      return null;
    } catch (error) {
      console.error('ScheduleStorage: Error fetching schedule:', error);
      return null;
    }
  }

  /**
   * Get all schedules for a user
   */
  async getUserSchedules(userId: string): Promise<ScheduleConfig[]> {
    try {
      console.log('ScheduleStorage: Fetching schedules for user:', userId);

      // Validate userId before querying
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new Error('Invalid userId provided to getUserSchedules');
      }

      // Try Firestore first with index-aware error handling
      try {
        const q = query(
          collection(db, this.COLLECTION_SCHEDULES),
          where('userId', '==', userId.trim()),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await handleFirestoreOperation(
          () => getDocs(q),
          'getUserSchedules'
        );

        const schedules: ScheduleConfig[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          schedules.push(this.convertFirestoreToSchedule(data));
        });

        if (schedules.length > 0) {
          console.log(`ScheduleStorage: Loaded ${schedules.length} schedules from Firestore`);
          return schedules;
        }
      } catch (firestoreError: any) {
        console.warn('ScheduleStorage: Firestore query failed:', firestoreError.code);
        
        if (firestoreError.code === 'failed-precondition') {
          console.log('ScheduleStorage: Index is still building, using localStorage fallback');
        } else {
          console.error('ScheduleStorage: Unexpected Firestore error:', firestoreError);
        }
        
        // Continue to localStorage fallback
      }

      // Fallback to localStorage
      const localSchedules: ScheduleConfig[] = [];
      const keys = Object.keys(localStorage).filter(key => key.startsWith(`schedule_${userId}_`));

      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const schedule = JSON.parse(data) as ScheduleConfig;
            localSchedules.push(schedule);
          }
        } catch (parseError) {
          console.warn('ScheduleStorage: Failed to parse schedule from localStorage:', key);
        }
      }

      // Sort by creation date (newest first)
      localSchedules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log(`ScheduleStorage: Loaded ${localSchedules.length} schedules from localStorage`);
      return localSchedules;
    } catch (error) {
      console.error('ScheduleStorage: Error fetching user schedules:', error);
      return [];
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string, userId: string): Promise<void> {
    try {
      console.log('ScheduleStorage: Deleting schedule:', scheduleId);

      // Remove from localStorage
      const localKey = `schedule_${userId}_${scheduleId}`;
      localStorage.removeItem(localKey);

      // Remove from Firestore
      const docRef = doc(db, this.COLLECTION_SCHEDULES, scheduleId);
      await deleteDoc(docRef);

      console.log('ScheduleStorage: Schedule deleted successfully');
    } catch (error) {
      console.error('ScheduleStorage: Error deleting schedule:', error);
      throw error;
    }
  }

  /**
   * Toggle schedule active status
   */
  async toggleSchedule(scheduleId: string, userId: string, isActive: boolean): Promise<void> {
    try {
      const schedule = await this.getSchedule(scheduleId, userId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const updatedSchedule = {
        ...schedule,
        isActive,
        updatedAt: new Date().toISOString()
      };

      await this.saveSchedule(updatedSchedule);
    } catch (error) {
      console.error('ScheduleStorage: Error toggling schedule:', error);
      throw error;
    }
  }

  /**
   * Log schedule execution
   */
  async logExecution(execution: ScheduleExecution): Promise<void> {
    try {
      console.log('ScheduleStorage: Logging execution:', execution.id);

      // Validate and sanitize execution data
      const validation = RobustErrorHandler.validateExecutionData(execution);
      if (!validation.isValid) {
        throw new Error(`Invalid execution data: ${validation.errors.join(', ')}`);
      }

      // Use robust cleaning for Firestore
      const cleanedExecution = RobustErrorHandler.cleanForFirestore(validation.sanitized);

      // Save to Firestore
      const docRef = doc(db, this.COLLECTION_EXECUTIONS, execution.id);
      const firestoreExecution = {
        ...cleanedExecution,
        executedAt: Timestamp.fromDate(new Date(execution.executedAt))
      };

      await RobustErrorHandler.withRetry(
        () => handleFirestoreOperation(
          () => setDoc(docRef, firestoreExecution),
          'logExecution'
        ),
        3,
        1000
      );

      // Update schedule's last run time and run count ONLY if execution was successful
      const schedule = await this.getSchedule(execution.scheduleId, execution.userId);
      if (schedule) {
        let updatedSchedule;
        
        if (execution.status === 'success') {
          // Successful execution - update lastRun and calculate next run
          const scheduleWithUpdatedRun = {
            ...schedule,
            lastRun: execution.executedAt,
            runCount: schedule.runCount + 1,
            lastError: undefined, // Clear any previous errors
            errorCount: schedule.errorCount // Don't increment error count on success
          };

          // Calculate the next run based on the updated schedule
          const nextRun = this.calculateNextRun(scheduleWithUpdatedRun);
          
          updatedSchedule = {
            ...scheduleWithUpdatedRun,
            nextRun: nextRun.toISOString()
          };

          console.log(`✅ ScheduleStorage: Schedule "${schedule.name}" executed successfully - Next run: ${nextRun.toLocaleString()}`);
        } else {
          // Failed execution - only update error info, keep original nextRun
          updatedSchedule = {
            ...schedule,
            lastError: execution.error,
            errorCount: schedule.errorCount + 1
            // Don't update lastRun or nextRun on failure
          };

          console.log(`❌ ScheduleStorage: Schedule "${schedule.name}" execution failed - keeping original nextRun`);
        }

        await this.saveSchedule(updatedSchedule);
      }

      console.log('ScheduleStorage: Execution logged successfully');
    } catch (error) {
      console.error('ScheduleStorage: Error logging execution:', error);
      throw error;
    }
  }

  /**
   * Get schedule execution history
   */
  async getExecutionHistory(scheduleId: string, userId: string, limitCount: number = 10): Promise<ScheduleExecution[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_EXECUTIONS),
        where('scheduleId', '==', scheduleId),
        where('userId', '==', userId),
        orderBy('executedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const executions: ScheduleExecution[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        executions.push({
          ...data,
          executedAt: data.executedAt.toDate().toISOString()
        } as ScheduleExecution);
      });

      return executions;
    } catch (error) {
      console.error('ScheduleStorage: Error fetching execution history:', error);
      return [];
    }
  }

  /**
   * Get schedule statistics for a user
   */
  async getScheduleStats(userId: string): Promise<ScheduleStats> {
    try {
      const schedules = await this.getUserSchedules(userId);
      const activeSchedules = schedules.filter(s => s.isActive);

      // Get execution stats with index-aware error handling
      let executions: ScheduleExecution[] = [];
      
      try {
        const q = query(
          collection(db, this.COLLECTION_EXECUTIONS),
          where('userId', '==', userId),
          orderBy('executedAt', 'desc'),
          limit(100)
        );

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          executions.push({
            ...data,
            executedAt: data.executedAt.toDate().toISOString()
          } as ScheduleExecution);
        });
      } catch (executionError: any) {
        console.warn('ScheduleStorage: Execution stats query failed:', executionError.code);
        
        if (executionError.code === 'failed-precondition') {
          console.log('ScheduleStorage: Execution index is still building, using empty stats');
        } else {
          console.error('ScheduleStorage: Unexpected execution query error:', executionError);
        }
        
        // Continue with empty executions array
        executions = [];
      }

      const successfulExecutions = executions.filter(e => e.status === 'success').length;
      const failedExecutions = executions.filter(e => e.status === 'failed').length;

      // Find next execution time
      const nextExecution = activeSchedules
        .filter(s => s.nextRun)
        .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())[0]?.nextRun;

      return {
        totalSchedules: schedules.length,
        activeSchedules: activeSchedules.length,
        totalExecutions: executions.length,
        successfulExecutions,
        failedExecutions,
        lastExecution: executions[0]?.executedAt,
        nextExecution
      };
    } catch (error) {
      console.error('ScheduleStorage: Error fetching schedule stats:', error);
      return {
        totalSchedules: 0,
        activeSchedules: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0
      };
    }
  }

  /**
   * Private helper methods
   */
  private validateSchedule(schedule: ScheduleConfig): void {
    // Basic required fields
    if (!schedule.id || !schedule.userId || !schedule.name) {
      throw new Error('Schedule must have id, userId, and name');
    }

    // Validate ID format (prevent injection)
    if (!/^[a-zA-Z0-9_-]+$/.test(schedule.id)) {
      throw new Error('Invalid schedule ID format');
    }

    // Validate user ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(schedule.userId)) {
      throw new Error('Invalid user ID format');
    }

    // Validate name length and content
    if (schedule.name.length > 100 || schedule.name.trim().length === 0) {
      throw new Error('Schedule name must be 1-100 characters');
    }

    // Validate time format
    if (!schedule.time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
      throw new Error('Invalid time format. Use HH:MM (24-hour)');
    }

    // Validate frequency-specific requirements
    if (schedule.frequency === 'weekly') {
      if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
        throw new Error('Weekly schedules must specify days of week');
      }
      if (schedule.daysOfWeek.some(day => day < 0 || day > 6)) {
        throw new Error('Days of week must be 0-6');
      }
    }

    if (schedule.frequency === 'monthly') {
      if (!schedule.dayOfMonth || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
        throw new Error('Monthly schedules must specify a valid day of month (1-31)');
      }
    }

    if (schedule.frequency === 'custom' && !schedule.cronExpression) {
      throw new Error('Custom schedules must specify a cron expression');
    }

    // Validate delivery methods
    if (!schedule.deliveryMethods.telegram.enabled && !schedule.deliveryMethods.email.enabled) {
      throw new Error('At least one delivery method must be enabled');
    }

    // Validate Telegram chat ID if enabled
    if (schedule.deliveryMethods.telegram.enabled) {
      const chatId = schedule.deliveryMethods.telegram.chatId;
      if (!chatId || !/^-?\d+$/.test(chatId)) {
        throw new Error('Invalid Telegram chat ID format');
      }
    }

    // Validate summary options
    if (!schedule.summaryOptions || !schedule.summaryOptions.style) {
      throw new Error('Summary options are required');
    }

    if (schedule.summaryOptions.contentDays < 1 || schedule.summaryOptions.contentDays > 30) {
      throw new Error('Content days must be between 1 and 30');
    }
  }

  private calculateNextRun(schedule: ScheduleConfig): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);

    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    // For daily schedules, if we just executed or the time has passed today, go to tomorrow
    if (schedule.frequency === 'daily') {
      // If we have a lastRun today, or the time has passed, schedule for tomorrow
      if (schedule.lastRun) {
        const lastRun = new Date(schedule.lastRun);
        const lastRunDate = lastRun.toDateString();
        const todayDate = now.toDateString();
        
        if (lastRunDate === todayDate) {
          // We already ran today, schedule for tomorrow
          nextRun.setDate(nextRun.getDate() + 1);
        } else if (nextRun <= now) {
          // Time has passed and we haven't run today, but schedule for tomorrow to be safe
          nextRun.setDate(nextRun.getDate() + 1);
        }
      } else if (nextRun <= now) {
        // No previous run, but time has passed today
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else {
      // For non-daily schedules, if the time has already passed today, start from tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    }

    switch (schedule.frequency) {
      case 'daily':
        // Already set correctly above
        break;

      case 'weekly':
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          // Find the next occurrence of any of the specified days
          let daysToAdd = 0;
          const currentDay = nextRun.getDay();
          const sortedDays = [...schedule.daysOfWeek].sort();
          
          // Find the next day in the current week
          const nextDayThisWeek = sortedDays.find(day => day > currentDay);
          
          if (nextDayThisWeek !== undefined) {
            daysToAdd = nextDayThisWeek - currentDay;
          } else {
            // Go to the first day of next week
            daysToAdd = 7 - currentDay + sortedDays[0];
          }
          
          nextRun.setDate(nextRun.getDate() + daysToAdd);
        }
        break;

      case 'monthly':
        if (schedule.dayOfMonth) {
          nextRun.setDate(schedule.dayOfMonth);
          
          // If the day has already passed this month, go to next month
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
            nextRun.setDate(schedule.dayOfMonth);
          }
        }
        break;

      case 'custom':
        // For custom cron expressions, we'd need a cron parser library
        // For now, default to daily
        console.warn('Custom cron expressions not yet implemented, defaulting to daily');
        break;
    }

    return nextRun;
  }

  private convertFirestoreToSchedule(data: any): ScheduleConfig {
    return {
      ...data,
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString(),
      lastRun: data.lastRun ? data.lastRun.toDate().toISOString() : undefined,
      nextRun: data.nextRun ? data.nextRun.toDate().toISOString() : undefined
    };
  }

  private cleanScheduleForFirestore(schedule: ScheduleConfig): any {
    // Remove undefined values as Firestore doesn't support them
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(schedule)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }

  private cleanExecutionForFirestore(execution: ScheduleExecution): any {
    // Deep clean execution data to remove undefined values
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(execution)) {
      if (value !== undefined) {
        if (key === 'deliveryResults' && typeof value === 'object' && value !== null) {
          // Clean delivery results object
          cleaned[key] = {};
          for (const [deliveryKey, deliveryValue] of Object.entries(value)) {
            if (deliveryValue !== undefined && typeof deliveryValue === 'object' && deliveryValue !== null) {
              // Clean individual delivery result
              cleaned[key][deliveryKey] = {};
              for (const [resultKey, resultValue] of Object.entries(deliveryValue)) {
                if (resultValue !== undefined) {
                  cleaned[key][deliveryKey][resultKey] = resultValue;
                }
              }
            }
          }
        } else {
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }
}

// Export singleton instance
export const scheduleStorageService = new ScheduleStorageService();