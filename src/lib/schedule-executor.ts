import { scheduleStorageService } from './schedule-storage';
import { AISummarizationService } from './ai-summarization';
import { telegramClientService } from './telegram-client';
import { NotionOAuthService } from './notion';
import { ScheduleConfig, ScheduleExecution } from './schedule-types';

export class ScheduleExecutorService {
  private aiService: AISummarizationService;
  private notionService: NotionOAuthService;

  constructor() {
    this.aiService = new AISummarizationService();
    
    // Initialize Notion service with dummy config (will be overridden per user)
    this.notionService = new NotionOAuthService({
      clientId: '',
      clientSecret: '',
      redirectUri: ''
    });
  }

  /**
   * Execute a single schedule
   */
  async executeSchedule(schedule: ScheduleConfig): Promise<ScheduleExecution> {
    // Security check: ensure schedule is active and valid
    if (!schedule.isActive) {
      throw new Error('Cannot execute inactive schedule');
    }
    
    if (!schedule.userId) {
      throw new Error('Schedule missing user ID');
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`🚀 Executing schedule: ${schedule.name} (${schedule.id}) for user: ${schedule.userId}`);

    const execution: ScheduleExecution = {
      id: executionId,
      scheduleId: schedule.id,
      userId: schedule.userId,
      executedAt: new Date().toISOString(),
      status: 'failed',
      deliveryResults: {},
      contentProcessed: 0,
      executionTime: 0,
    };

    try {
      // Step 1: Get user's Notion integration
      const notionIntegration = await this.getUserNotionIntegration(schedule.userId);
      if (!notionIntegration) {
        throw new Error('Notion integration not found for user');
      }

      // Step 2: Fetch content from Notion
      console.log(`📚 Fetching Notion content for the last ${schedule.summaryOptions.contentDays} days...`);
      const notionContent = await this.notionService.getContentForAI(
        notionIntegration.accessToken,
        schedule.summaryOptions.contentDays
      );

      if (notionContent.length === 0) {
        console.log('⚠️ No content found for summarization');
        execution.status = 'partial';
        execution.error = 'No content found for summarization';
        execution.executionTime = Date.now() - startTime;
        return execution;
      }

      execution.contentProcessed = notionContent.length;
      console.log(`📄 Found ${notionContent.length} content items to process`);

      // Step 3: Generate AI summary
      console.log('🧠 Generating AI summary...');
      const summaryResult = await this.aiService.smartSummarizeContent(
        notionContent,
        schedule.summaryOptions,
        schedule.userId
      );

      execution.summaryId = summaryResult.id;
      console.log(`✅ Summary generated: ${summaryResult.id}`);

      // Step 4: Deliver via configured methods
      let deliverySuccess = false;

      // Telegram delivery
      if (schedule.deliveryMethods.telegram.enabled && schedule.deliveryMethods.telegram.chatId) {
        console.log('📱 Delivering via Telegram...');
        try {
          const telegramResult = await telegramClientService.sendSummary({
            chatId: schedule.deliveryMethods.telegram.chatId,
            summary: summaryResult.summary,
            actionItems: summaryResult.actionItems,
            keyInsights: summaryResult.keyInsights,
            priority: summaryResult.priority,
            readingTime: summaryResult.readingTime,
            createdAt: summaryResult.createdAt,
          });

          // Clean delivery result to avoid undefined values in Firestore
          const telegramDeliveryResult: any = {
            success: telegramResult.success,
          };
          
          if (telegramResult.messageId !== undefined) {
            telegramDeliveryResult.messageId = telegramResult.messageId;
          }
          
          if (telegramResult.error !== undefined) {
            telegramDeliveryResult.error = telegramResult.error;
          }
          
          execution.deliveryResults.telegram = telegramDeliveryResult;

          if (telegramResult.success) {
            deliverySuccess = true;
            console.log('✅ Telegram delivery successful');
          } else {
            console.error('❌ Telegram delivery failed:', telegramResult.error);
          }
        } catch (telegramError) {
          console.error('❌ Telegram delivery error:', telegramError);
          execution.deliveryResults.telegram = {
            success: false,
            error: telegramError instanceof Error ? telegramError.message : 'Unknown error',
          };
        }
      }

      // Email delivery (placeholder for future implementation)
      if (schedule.deliveryMethods.email.enabled && schedule.deliveryMethods.email.address) {
        console.log('📧 Email delivery not yet implemented');
        execution.deliveryResults.email = {
          success: false,
          error: 'Email delivery not yet implemented',
        };
      }

      // Determine overall execution status
      if (deliverySuccess) {
        execution.status = 'success';
        console.log('🎉 Schedule execution completed successfully');
      } else {
        execution.status = 'failed';
        execution.error = 'All delivery methods failed';
        console.error('❌ All delivery methods failed');
      }

    } catch (error) {
      console.error('❌ Schedule execution failed:', error);
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
    }

    execution.executionTime = Date.now() - startTime;

    // Log the execution and update schedule
    try {
      await scheduleStorageService.logExecution(execution);
      console.log(`📝 Execution logged for schedule ${schedule.id} with status: ${execution.status}`);
    } catch (logError) {
      console.error('Failed to log execution:', logError);
    }

    return execution;
  }

  /**
   * Execute all due schedules
   */
  async executeAllDueSchedules(): Promise<ScheduleExecution[]> {
    console.log('🔍 Checking for due schedules...');

    try {
      // This would typically be called by a cron job or scheduled function
      // For now, we'll implement a simple check
      const allSchedules = await this.getAllActiveSchedules();
      const dueSchedules = allSchedules.filter(schedule => this.isScheduleDue(schedule));

      console.log(`📅 Found ${dueSchedules.length} due schedules out of ${allSchedules.length} active schedules`);

      const executions: ScheduleExecution[] = [];

      for (const schedule of dueSchedules) {
        try {
          const execution = await this.executeSchedule(schedule);
          executions.push(execution);
        } catch (error) {
          console.error(`Failed to execute schedule ${schedule.id}:`, error);
        }
      }

      return executions;
    } catch (error) {
      console.error('Error executing due schedules:', error);
      return [];
    }
  }

  /**
   * Check if a schedule is due for execution
   */
  private isScheduleDue(schedule: ScheduleConfig): boolean {
    if (!schedule.isActive || !schedule.nextRun) {
      return false;
    }

    const now = new Date();
    const nextRun = new Date(schedule.nextRun);

    return nextRun <= now;
  }

  /**
   * Get all active schedules (this would typically query all users)
   */
  private async getAllActiveSchedules(): Promise<ScheduleConfig[]> {
    // In a real implementation, this would query all users' schedules
    // For now, we'll return an empty array since we don't have a way to get all users
    console.warn('getAllActiveSchedules: Not implemented for multi-user scenario');
    return [];
  }

  /**
   * Get user's Notion integration
   */
  private async getUserNotionIntegration(userId: string): Promise<{ accessToken: string } | null> {
    try {
      // This would typically fetch from your user integration storage
      // For now, we'll check localStorage (this is a limitation of client-side execution)
      const integrationKey = `notion_integration_${userId}`;
      const integrationData = localStorage.getItem(integrationKey);
      
      if (integrationData) {
        const integration = JSON.parse(integrationData);
        return { accessToken: integration.accessToken };
      }

      return null;
    } catch (error) {
      console.error('Error getting user Notion integration:', error);
      return null;
    }
  }

  /**
   * Manual execution trigger (for testing)
   */
  async executeScheduleManually(scheduleId: string, userId: string): Promise<ScheduleExecution> {
    console.log(`🔧 Manual execution triggered for schedule: ${scheduleId}`);

    const schedule = await scheduleStorageService.getSchedule(scheduleId, userId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return await this.executeSchedule(schedule);
  }
}

// Export singleton instance
export const scheduleExecutorService = new ScheduleExecutorService();