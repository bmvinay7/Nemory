import { scheduleStorageService } from './schedule-storage';
import { scheduleExecutorService } from './schedule-executor';
import { ScheduleConfig } from './schedule-types';

export class ScheduleManagerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkInterval = 30000; // Check every 30 seconds for better responsiveness
  private currentUserId: string | null = null;
  private executingSchedules = new Set<string>(); // Track currently executing schedules
  private lastExecutionCheck = new Map<string, number>(); // Track last execution time per schedule

  /**
   * Start the schedule manager for a specific user
   */
  start(userId: string): void {
    if (this.isRunning && this.currentUserId === userId) {
      console.log('ScheduleManager: Already running for this user');
      return;
    }

    if (this.isRunning && this.currentUserId !== userId) {
      console.log(`ScheduleManager: Switching from user ${this.currentUserId} to ${userId}`);
    }

    this.stop(); // Stop any existing manager
    this.currentUserId = userId;
    this.isRunning = true;

    console.log(`🕐 ScheduleManager: Starting for user ${userId}`);
    
    // Run initial check after a short delay to avoid conflicts
    setTimeout(() => {
      if (this.isRunning && this.currentUserId === userId) {
        this.checkAndExecuteSchedules();
      }
    }, 5000); // 5 second delay
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkAndExecuteSchedules();
    }, this.checkInterval);

    console.log(`⏰ ScheduleManager: Will check every ${this.checkInterval / 1000} seconds`);
  }

  /**
   * Stop the schedule manager
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.isRunning) {
      console.log('🛑 ScheduleManager: Stopped');
    }
    
    this.isRunning = false;
    this.currentUserId = null;
    this.executingSchedules.clear();
    this.lastExecutionCheck.clear();
  }

  /**
   * Check for due schedules and execute them
   */
  private async checkAndExecuteSchedules(): Promise<void> {
    if (!this.currentUserId) {
      console.warn('ScheduleManager: No user ID set');
      return;
    }

    try {
      const now = new Date();
      console.log(`🔍 ScheduleManager: Checking for due schedules at ${now.toLocaleTimeString()}...`);
      
      // Get user's schedules
      const schedules = await scheduleStorageService.getUserSchedules(this.currentUserId);
      const activeSchedules = schedules.filter(s => s.isActive);
      
      if (activeSchedules.length === 0) {
        console.log('📅 ScheduleManager: No active schedules found');
        return;
      }

      console.log(`📋 ScheduleManager: Found ${activeSchedules.length} active schedules:`);
      activeSchedules.forEach(schedule => {
        console.log(`  - "${schedule.name}" (${schedule.frequency} at ${schedule.time})`);
        console.log(`    Next run: ${schedule.nextRun || 'not set'}`);
        console.log(`    Last run: ${schedule.lastRun || 'never'}`);
      });

      // Check which schedules are due
      const dueSchedules = activeSchedules.filter(schedule => this.isScheduleDue(schedule));
      
      if (dueSchedules.length === 0) {
        console.log(`📅 ScheduleManager: No due schedules (${activeSchedules.length} active schedules checked)`);
        return;
      }

      console.log(`🚀 ScheduleManager: Found ${dueSchedules.length} due schedules`);

      // Execute due schedules (with duplicate prevention)
      for (const schedule of dueSchedules) {
        // Skip if already executing
        if (this.executingSchedules.has(schedule.id)) {
          console.log(`⏭️ ScheduleManager: Schedule "${schedule.name}" is already executing, skipping`);
          continue;
        }

        // Check if we executed this schedule recently (reduced to 2 minutes for better responsiveness)
        const lastExecution = this.lastExecutionCheck.get(schedule.id);
        const now = Date.now();
        if (lastExecution && (now - lastExecution) < 120000) { // 2 minutes
          console.log(`⏭️ ScheduleManager: Schedule "${schedule.name}" executed recently, skipping`);
          continue;
        }

        try {
          console.log(`⚡ ScheduleManager: Executing schedule "${schedule.name}" (${schedule.id})`);
          
          // Mark as executing
          this.executingSchedules.add(schedule.id);
          this.lastExecutionCheck.set(schedule.id, now);
          
          // Trigger UI update for execution start
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('scheduleStarted', { 
              detail: { scheduleId: schedule.id, scheduleName: schedule.name } 
            }));
          }
          
          await scheduleExecutorService.executeSchedule(schedule);
          
          console.log(`✅ ScheduleManager: Successfully executed schedule "${schedule.name}"`);
          
          // Trigger a UI refresh by dispatching a custom event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('scheduleExecuted', { 
              detail: { scheduleId: schedule.id, scheduleName: schedule.name, success: true } 
            }));
          }
        } catch (error) {
          console.error(`❌ ScheduleManager: Failed to execute schedule ${schedule.id}:`, error);
          
          // Clear execution tracking on failure so it can be retried
          this.lastExecutionCheck.delete(schedule.id);
          
          // Trigger a UI refresh for failed execution
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('scheduleExecuted', { 
              detail: { scheduleId: schedule.id, scheduleName: schedule.name, success: false, error: error } 
            }));
          }
        } finally {
          // Remove from executing set
          this.executingSchedules.delete(schedule.id);
        }
      }

    } catch (error) {
      console.error('❌ ScheduleManager: Error checking schedules:', error);
    }
  }

  /**
   * Check if a schedule is due for execution
   */
  private isScheduleDue(schedule: ScheduleConfig): boolean {
    if (!schedule.isActive) {
      console.log(`⏭️ Schedule "${schedule.name}" is inactive, skipping`);
      return false;
    }

    const now = new Date();
    
    // Check if we already executed this recently
    const lastExecution = this.lastExecutionCheck.get(schedule.id);
    if (lastExecution && (Date.now() - lastExecution) < 120000) { // 2 minutes
      console.log(`⏭️ Schedule "${schedule.name}" executed recently (${Math.floor((Date.now() - lastExecution) / 1000)}s ago), skipping`);
      return false;
    }

    // If nextRun is set, use it
    if (schedule.nextRun) {
      const nextRun = new Date(schedule.nextRun);
      const isDue = nextRun <= now;
      
      console.log(`🕐 Schedule "${schedule.name}": nextRun=${nextRun.toLocaleString()}, now=${now.toLocaleString()}, isDue=${isDue}`);
      
      // Additional check: don't execute if we already ran successfully today for daily schedules
      if (isDue && schedule.frequency === 'daily' && schedule.lastRun) {
        const lastRun = new Date(schedule.lastRun);
        const lastRunDate = lastRun.toDateString();
        const todayDate = now.toDateString();
        
        // Only skip if we successfully ran today (no lastError means success)
        if (lastRunDate === todayDate && !schedule.lastError) {
          console.log(`⏭️ Schedule "${schedule.name}" already ran successfully today (${lastRun.toLocaleString()}), skipping`);
          return false;
        } else if (lastRunDate === todayDate && schedule.lastError) {
          console.log(`🔄 Schedule "${schedule.name}" failed earlier today, allowing retry`);
        }
      }
      
      if (isDue) {
        console.log(`✅ Schedule "${schedule.name}" is due for execution!`);
      }
      
      return isDue;
    }

    // Fallback: calculate if it's due based on frequency and time
    console.log(`🔄 Schedule "${schedule.name}" has no nextRun, calculating based on frequency`);
    return this.calculateIfDue(schedule, now);
  }

  /**
   * Calculate if a schedule is due based on its configuration
   */
  private calculateIfDue(schedule: ScheduleConfig, now: Date): boolean {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    // Check if we're past the scheduled time today
    const scheduledTimeToday = new Date(now);
    scheduledTimeToday.setHours(hours, minutes, 0, 0);
    
    // If the scheduled time hasn't passed today, it's not due
    if (now < scheduledTimeToday) {
      return false;
    }

    // Check if we already ran successfully today (to avoid multiple executions)
    if (schedule.lastRun) {
      const lastRun = new Date(schedule.lastRun);
      const lastRunDate = lastRun.toDateString();
      const todayDate = now.toDateString();
      
      // For all frequencies, if we already ran successfully today at or after the scheduled time, don't run again
      if (lastRunDate === todayDate && !schedule.lastError) {
        const lastRunTime = new Date(lastRun);
        lastRunTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (lastRunTime >= scheduledTimeToday) {
          console.log(`⏭️ Schedule "${schedule.name}" already ran successfully today at ${lastRun.toLocaleTimeString()}, skipping`);
          return false;
        }
      } else if (lastRunDate === todayDate && schedule.lastError) {
        console.log(`🔄 Schedule "${schedule.name}" failed earlier today, allowing retry`);
      }
    }

    switch (schedule.frequency) {
      case 'daily':
        return true; // Already checked time and last run above

      case 'weekly':
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          const currentDay = now.getDay();
          const isCorrectDay = schedule.daysOfWeek.includes(currentDay);
          
          if (!isCorrectDay) {
            return false;
          }
          
          // Additional check for weekly: don't run if we already ran successfully this week on this day
          if (schedule.lastRun && !schedule.lastError) {
            const lastRun = new Date(schedule.lastRun);
            const daysDiff = Math.floor((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff < 7 && lastRun.getDay() === currentDay) {
              console.log(`⏭️ Weekly schedule "${schedule.name}" already ran successfully this week, skipping`);
              return false;
            }
          }
          
          return true;
        }
        return false;

      case 'monthly':
        if (schedule.dayOfMonth) {
          const currentDate = now.getDate();
          const isCorrectDate = currentDate === schedule.dayOfMonth;
          
          if (!isCorrectDate) {
            return false;
          }
          
          // Additional check for monthly: don't run if we already ran successfully this month
          if (schedule.lastRun && !schedule.lastError) {
            const lastRun = new Date(schedule.lastRun);
            
            if (lastRun.getFullYear() === now.getFullYear() && 
                lastRun.getMonth() === now.getMonth() &&
                lastRun.getDate() === schedule.dayOfMonth) {
              console.log(`⏭️ Monthly schedule "${schedule.name}" already ran successfully this month, skipping`);
              return false;
            }
          }
          
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get the current status
   */
  getStatus(): { isRunning: boolean; userId: string | null; checkInterval: number } {
    return {
      isRunning: this.isRunning,
      userId: this.currentUserId,
      checkInterval: this.checkInterval,
    };
  }

  /**
   * Force check schedules now (for testing)
   */
  async forceCheck(): Promise<void> {
    console.log('🔧 ScheduleManager: Force checking schedules...');
    
    try {
      // Add timeout to prevent hanging
      const checkPromise = this.checkAndExecuteSchedules();
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Force check timeout')), 25000)
      );
      
      await Promise.race([checkPromise, timeoutPromise]);
      console.log('✅ ScheduleManager: Force check completed');
    } catch (error) {
      console.error('❌ ScheduleManager: Force check failed:', error);
      throw error;
    }
  }

  /**
   * Clear execution tracking for a specific schedule (used after manual execution)
   */
  clearExecutionTracking(scheduleId: string): void {
    this.executingSchedules.delete(scheduleId);
    this.lastExecutionCheck.delete(scheduleId);
    console.log(`🧹 ScheduleManager: Cleared execution tracking for schedule ${scheduleId}`);
  }

  /**
   * Check if a schedule is currently executing
   */
  isScheduleExecuting(scheduleId: string): boolean {
    return this.executingSchedules.has(scheduleId);
  }

  /**
   * Get debug information about the schedule manager
   */
  getDebugInfo(): { 
    isRunning: boolean; 
    userId: string | null; 
    executingSchedules: string[]; 
    lastExecutionTimes: Record<string, number>;
  } {
    return {
      isRunning: this.isRunning,
      userId: this.currentUserId,
      executingSchedules: Array.from(this.executingSchedules),
      lastExecutionTimes: Object.fromEntries(this.lastExecutionCheck),
    };
  }
}

// Export singleton instance
export const scheduleManagerService = new ScheduleManagerService();

// Add global debug access for development
if (typeof window !== 'undefined') {
  (window as any).scheduleManagerDebug = {
    getStatus: () => scheduleManagerService.getStatus(),
    getDebugInfo: () => scheduleManagerService.getDebugInfo(),
    forceCheck: () => scheduleManagerService.forceCheck(),
    clearTracking: (scheduleId: string) => scheduleManagerService.clearExecutionTracking(scheduleId),
    clearAllTracking: () => {
      const debug = scheduleManagerService.getDebugInfo();
      debug.executingSchedules.forEach(id => scheduleManagerService.clearExecutionTracking(id));
      console.log('🧹 Cleared all execution tracking');
    },
    restart: () => {
      const status = scheduleManagerService.getStatus();
      if (status.userId) {
        scheduleManagerService.stop();
        scheduleManagerService.start(status.userId);
        console.log('🔄 Restarted schedule manager');
      }
    }
  };
}