export interface ScheduleConfig {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  
  // Timing Configuration
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  time: string; // HH:MM format (24-hour)
  timezone: string; // e.g., 'America/New_York'
  
  // Weekly specific
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  
  // Monthly specific
  dayOfMonth?: number; // 1-31
  
  // Custom cron expression
  cronExpression?: string;
  
  // Summary Configuration
  summaryOptions: {
    style: 'executive' | 'detailed' | 'bullet_points' | 'action_items';
    length: 'short' | 'medium' | 'long';
    focus: string[];
    includeActionItems: boolean;
    includePriority: boolean;
    contentDays: number; // How many days back to look for content
  };
  
  // Delivery Configuration
  deliveryMethods: {
    telegram: {
      enabled: boolean;
      chatId?: string;
    };
    email: {
      enabled: boolean;
      address?: string;
    };
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  
  // Error tracking
  lastError?: string;
  errorCount: number;
}

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  userId: string;
  executedAt: string;
  status: 'success' | 'failed' | 'partial';
  summaryId?: string;
  deliveryResults: {
    telegram?: {
      success: boolean;
      messageId?: number;
      error?: string;
    };
    email?: {
      success: boolean;
      messageId?: string;
      error?: string;
    };
  };
  contentProcessed: number;
  executionTime: number; // milliseconds
  error?: string;
}

export interface ScheduleStats {
  totalSchedules: number;
  activeSchedules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecution?: string;
  nextExecution?: string;
}