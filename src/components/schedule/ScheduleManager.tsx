import React, { useState, useEffect } from 'react';
import { Plus, Clock, Calendar, Settings, Play, Pause, Trash2, BarChart3, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { scheduleStorageService } from '@/lib/schedule-storage';
import { scheduleExecutorService } from '@/lib/schedule-executor';
import { scheduleManagerService } from '@/lib/schedule-manager';
import { firestoreIndexChecker } from '@/lib/firestore-index-checker';
import { ScheduleConfig, ScheduleStats } from '@/lib/schedule-types';
import { toast } from '@/components/ui/use-toast';
import CreateScheduleDialog from './CreateScheduleDialog';
import EditScheduleDialog from './EditScheduleDialog';
import ScheduleStatsCard from './ScheduleStatsCard';

const ScheduleManager: React.FC = () => {
  const { currentUser } = useAuth();

  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [stats, setStats] = useState<ScheduleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleConfig | null>(null);
  const [executingSchedule, setExecutingSchedule] = useState<string | null>(null);
  const [checkingSchedules, setCheckingSchedules] = useState(false);
  const [backgroundExecutingSchedules, setBackgroundExecutingSchedules] = useState<Set<string>>(new Set());
  const [indexStatus, setIndexStatus] = useState<{ allReady: boolean; checking: boolean }>({ 
    allReady: true, 
    checking: false 
  });

  useEffect(() => {
    if (currentUser) {
      checkIndexStatus();
      loadSchedules();
      loadStats();
    }
  }, [currentUser]);

  // Listen for schedule execution events to refresh data
  useEffect(() => {
    const handleScheduleExecuted = async (event: CustomEvent) => {
      console.log(`🔄 Schedule "${event.detail.scheduleName}" executed (success: ${event.detail.success}), refreshing data...`);
      
      setBackgroundExecutingSchedules(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.detail.scheduleId);
        return newSet;
      });
      
      // Force refresh the schedule data
      try {
        await loadSchedules();
        await loadStats();
        console.log('✅ Schedule data refreshed after execution');
      } catch (error) {
        console.error('❌ Failed to refresh schedule data:', error);
      }
    };

    const handleScheduleStarted = (event: CustomEvent) => {
      console.log(`🚀 Schedule "${event.detail.scheduleName}" started executing...`);
      setBackgroundExecutingSchedules(prev => new Set(prev).add(event.detail.scheduleId));
    };

    window.addEventListener('scheduleExecuted', handleScheduleExecuted as EventListener);
    window.addEventListener('scheduleStarted', handleScheduleStarted as EventListener);
    
    return () => {
      window.removeEventListener('scheduleExecuted', handleScheduleExecuted as EventListener);
      window.removeEventListener('scheduleStarted', handleScheduleStarted as EventListener);
    };
  }, [loadSchedules, loadStats]);

  // Periodic refresh to keep schedule status updated
  useEffect(() => {
    if (!currentUser) return;

    const refreshInterval = setInterval(async () => {
      console.log('🔄 Periodic refresh of schedule data...');
      try {
        await loadSchedules();
        await loadStats();
      } catch (error) {
        console.error('❌ Periodic refresh failed:', error);
      }
    }, 30000); // Refresh every 30 seconds for better responsiveness

    return () => clearInterval(refreshInterval);
  }, [currentUser, loadSchedules, loadStats]);

  const checkIndexStatus = async () => {
    if (!currentUser) return;

    try {
      setIndexStatus({ allReady: false, checking: true });
      const status = await firestoreIndexChecker.checkAllIndexes(currentUser.uid);
      setIndexStatus({ allReady: status.allReady, checking: false });
      
      if (!status.allReady) {
        toast({
          title: 'Database Setup in Progress',
          description: 'Firestore indexes are building. Some features may be limited for a few minutes.',
        });
      }
    } catch (error) {
      console.error('Error checking index status:', error);
      setIndexStatus({ allReady: true, checking: false }); // Assume ready on error
    }
  };

  const loadSchedules = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      console.log('📋 Loading schedules from Firestore...');
      const userSchedules = await scheduleStorageService.getUserSchedules(currentUser.uid);
      console.log(`📋 Loaded ${userSchedules.length} schedules:`, userSchedules.map(s => ({
        id: s.id,
        name: s.name,
        nextRun: s.nextRun,
        lastRun: s.lastRun,
        lastError: s.lastError
      })));
      setSchedules(userSchedules);
    } catch (error: any) {
      console.error('Error loading schedules:', error);
      
      if (error.code === 'failed-precondition') {
        toast({
          title: 'Database Indexes Building',
          description: 'The scheduling system is being set up. Please wait a few minutes and refresh the page.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load schedules. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentUser) return;

    try {
      const scheduleStats = await scheduleStorageService.getScheduleStats(currentUser.uid);
      setStats(scheduleStats);
    } catch (error) {
      console.error('Error loading schedule stats:', error);
    }
  };

  const handleToggleSchedule = async (schedule: ScheduleConfig) => {
    if (!currentUser) return;

    try {
      await scheduleStorageService.toggleSchedule(schedule.id, currentUser.uid, !schedule.isActive);
      
      toast({
        title: schedule.isActive ? 'Schedule Paused' : 'Schedule Activated',
        description: `"${schedule.name}" has been ${schedule.isActive ? 'paused' : 'activated'}.`,
      });

      await loadSchedules();
      await loadStats();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSchedule = async (schedule: ScheduleConfig) => {
    if (!currentUser) return;

    if (!confirm(`Are you sure you want to delete "${schedule.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await scheduleStorageService.deleteSchedule(schedule.id, currentUser.uid);
      
      toast({
        title: 'Schedule Deleted',
        description: `"${schedule.name}" has been deleted.`,
      });

      await loadSchedules();
      await loadStats();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExecuteSchedule = async (schedule: ScheduleConfig) => {
    if (!currentUser) return;

    // Check if schedule is already executing in the background
    if (scheduleManagerService.isScheduleExecuting(schedule.id)) {
      toast({
        title: 'Schedule Already Running',
        description: `"${schedule.name}" is already being executed. Please wait.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setExecutingSchedule(schedule.id);
      
      toast({
        title: 'Executing Schedule',
        description: `Running "${schedule.name}" manually...`,
      });

      const execution = await scheduleExecutorService.executeScheduleManually(schedule.id, currentUser.uid);
      
      // Clear execution tracking after manual execution
      scheduleManagerService.clearExecutionTracking(schedule.id);
      
      if (execution.status === 'success') {
        toast({
          title: 'Schedule Executed Successfully',
          description: `"${schedule.name}" completed successfully and was delivered.`,
        });
      } else if (execution.status === 'partial') {
        toast({
          title: 'Schedule Partially Executed',
          description: execution.error || 'Some issues occurred during execution.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Schedule Execution Failed',
          description: execution.error || 'Failed to execute schedule.',
          variant: 'destructive',
        });
      }

      await loadSchedules();
      await loadStats();
    } catch (error) {
      console.error('Error executing schedule:', error);
      toast({
        title: 'Execution Error',
        description: 'Failed to execute schedule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExecutingSchedule(null);
    }
  };

  const handleCheckSchedulesNow = async () => {
    if (!currentUser) return;

    try {
      setCheckingSchedules(true);
      
      toast({
        title: 'Checking Schedules',
        description: 'Manually checking for due schedules...',
      });

      // Add timeout to prevent hanging
      const checkPromise = scheduleManagerService.forceCheck();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Check timeout after 30 seconds')), 30000)
      );

      await Promise.race([checkPromise, timeoutPromise]);
      
      // Always refresh the data after check
      console.log('🔄 Refreshing schedule data after check...');
      await Promise.all([loadSchedules(), loadStats()]);

      toast({
        title: 'Schedule Check Complete',
        description: 'All due schedules have been processed.',
      });
    } catch (error) {
      console.error('Error checking schedules:', error);
      toast({
        title: 'Check Failed',
        description: error instanceof Error ? error.message : 'Failed to check schedules. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCheckingSchedules(false);
    }
  };

  const formatFrequency = (schedule: ScheduleConfig): string => {
    switch (schedule.frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        if (schedule.daysOfWeek) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const days = schedule.daysOfWeek.map(d => dayNames[d]).join(', ');
          return `Weekly (${days})`;
        }
        return 'Weekly';
      case 'monthly':
        return `Monthly (${schedule.dayOfMonth}${getOrdinalSuffix(schedule.dayOfMonth || 1)})`;
      case 'custom':
        return 'Custom';
      default:
        return schedule.frequency;
    }
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatNextRun = (nextRun: string): string => {
    const date = new Date(nextRun);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    // If the time has passed, show "overdue"
    if (diffMs < 0) {
      const overdueMins = Math.floor(Math.abs(diffMs) / (1000 * 60));
      if (overdueMins < 60) {
        return `overdue by ${overdueMins}min`;
      } else {
        const overdueHours = Math.floor(overdueMins / 60);
        return `overdue by ${overdueHours}h`;
      }
    }
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `in ${diffMinutes} min${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'now';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schedule Manager</h2>
          <p className="text-muted-foreground">
            Automate your AI summaries with custom schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleCheckSchedulesNow}
            disabled={checkingSchedules}
            className="flex items-center gap-2"
          >
            {checkingSchedules ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check Now
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={async () => {
              console.log('🔄 Force refreshing schedule data...');
              await loadSchedules();
              await loadStats();
            }}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Schedule
          </Button>
        </div>
      </div>

      {/* Index Status Warning */}
      {!indexStatus.allReady && !indexStatus.checking && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
              <div>
                <p className="text-sm font-medium text-yellow-800">Database Setup in Progress</p>
                <p className="text-sm text-yellow-600">
                  Firestore indexes are building. Scheduling features will be fully available in a few minutes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && <ScheduleStatsCard stats={stats} />}

      {/* Schedules List */}
      <div className="grid gap-4">
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Schedules Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first automated summary schedule to get started.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id} className={`transition-all ${schedule.isActive ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${schedule.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{schedule.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {formatFrequency(schedule)} at {schedule.time}
                        {schedule.isActive && (
                          <span className="text-green-600 font-medium">
                            {(executingSchedule === schedule.id || backgroundExecutingSchedules.has(schedule.id)) ? (
                              <span className="flex items-center gap-1">
                                <div className="h-2 w-2 animate-spin rounded-full border border-green-600 border-t-transparent" />
                                • Executing...
                              </span>
                            ) : schedule.nextRun ? (
                              `• Next: ${formatNextRun(schedule.nextRun)}`
                            ) : (
                              '• Calculating next run...'
                            )}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                      {schedule.isActive ? 'Active' : 'Paused'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExecuteSchedule(schedule)}
                        disabled={executingSchedule === schedule.id}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Run now"
                      >
                        {executingSchedule === schedule.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleSchedule(schedule)}
                        className="h-8 w-8 p-0"
                        title={schedule.isActive ? 'Pause schedule' : 'Activate schedule'}
                      >
                        {schedule.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSchedule(schedule)}
                        className="h-8 w-8 p-0"
                        title="Edit schedule"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSchedule(schedule)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete schedule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Style:</span>
                    <p className="font-medium capitalize">{schedule.summaryOptions.style.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Length:</span>
                    <p className="font-medium capitalize">{schedule.summaryOptions.length}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Content Days:</span>
                    <p className="font-medium">{schedule.summaryOptions.contentDays} days</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Runs:</span>
                    <p className="font-medium">{schedule.runCount} times</p>
                  </div>
                </div>
                
                {/* Delivery Methods */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-sm text-muted-foreground">Delivery:</span>
                  {schedule.deliveryMethods.telegram.enabled && (
                    <Badge variant="outline" className="text-xs">
                      Telegram
                    </Badge>
                  )}
                  {schedule.deliveryMethods.email.enabled && (
                    <Badge variant="outline" className="text-xs">
                      Email
                    </Badge>
                  )}
                </div>

                {/* Error indicator with retry info */}
                {schedule.lastError && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">
                      <strong>Last Error:</strong> {schedule.lastError}
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      Will retry at next scheduled time
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      <CreateScheduleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onScheduleCreated={() => {
          loadSchedules();
          loadStats();
        }}
      />

      {editingSchedule && (
        <EditScheduleDialog
          schedule={editingSchedule}
          open={!!editingSchedule}
          onOpenChange={(open) => !open && setEditingSchedule(null)}
          onScheduleUpdated={() => {
            loadSchedules();
            loadStats();
            setEditingSchedule(null);
          }}
        />
      )}
    </div>
  );
};

export default ScheduleManager;