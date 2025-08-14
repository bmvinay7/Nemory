import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { scheduleStorageService } from '@/lib/schedule-storage';
import { telegramPreferencesService } from '@/lib/telegram-preferences';
import { ScheduleConfig } from '@/lib/schedule-types';
import { toast } from '@/components/ui/use-toast';
import { Settings, CheckCircle, MessageSquare } from 'lucide-react';

interface EditScheduleDialogProps {
  schedule: ScheduleConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleUpdated: () => void;
}

const EditScheduleDialog: React.FC<EditScheduleDialogProps> = ({
  schedule,
  open,
  onOpenChange,
  onScheduleUpdated,
}) => {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(schedule);
  const [telegramPreferences, setTelegramPreferences] = useState<any>(null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const focusOptions = [
    { value: 'tasks', label: 'Tasks & To-dos' },
    { value: 'ideas', label: 'Ideas & Insights' },
    { value: 'decisions', label: 'Decisions Made' },
    { value: 'meetings', label: 'Meeting Notes' },
    { value: 'projects', label: 'Project Updates' },
    { value: 'learning', label: 'Learning & Research' },
  ];

  useEffect(() => {
    setFormData(schedule);
    if (open && currentUser) {
      loadTelegramPreferences();
    }
  }, [schedule, open, currentUser]);

  const loadTelegramPreferences = async () => {
    if (!currentUser) return;

    try {
      const preferences = await telegramPreferencesService.getUserPreferences(currentUser.uid);
      
      if (preferences && preferences.isVerified && preferences.chatId) {
        setTelegramPreferences(preferences);
      } else {
        setTelegramPreferences(null);
      }
    } catch (error) {
      console.error('Error loading Telegram preferences:', error);
      setTelegramPreferences(null);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Validation
      if (!formData.name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a schedule name.',
          variant: 'destructive',
        });
        return;
      }

      if (formData.frequency === 'weekly' && (!formData.daysOfWeek || formData.daysOfWeek.length === 0)) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least one day for weekly schedules.',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.deliveryMethods.telegram.enabled && !formData.deliveryMethods.email.enabled) {
        toast({
          title: 'Validation Error',
          description: 'Please enable at least one delivery method.',
          variant: 'destructive',
        });
        return;
      }

      if (formData.deliveryMethods.telegram.enabled && !formData.deliveryMethods.telegram.chatId?.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter your Telegram chat ID.',
          variant: 'destructive',
        });
        return;
      }

      // Update schedule
      const updatedSchedule: ScheduleConfig = {
        ...formData,
        name: formData.name.trim(),
        updatedAt: new Date().toISOString(),
      };

      await scheduleStorageService.saveSchedule(updatedSchedule);

      toast({
        title: 'Schedule Updated',
        description: `"${updatedSchedule.name}" has been updated.`,
      });

      onScheduleUpdated();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    const currentDays = formData.daysOfWeek || [];
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter(d => d !== dayIndex)
      : [...currentDays, dayIndex];
    
    setFormData(prev => ({
      ...prev,
      daysOfWeek: newDays.sort(),
    }));
  };

  const handleFocusToggle = (focus: string) => {
    const newFocus = formData.summaryOptions.focus.includes(focus)
      ? formData.summaryOptions.focus.filter(f => f !== focus)
      : [...formData.summaryOptions.focus, focus];
    
    setFormData(prev => ({
      ...prev,
      summaryOptions: {
        ...prev.summaryOptions,
        focus: newFocus,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Schedule
          </DialogTitle>
          <DialogDescription>
            Update your automated AI summary schedule settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
              <CardDescription>
                Configure when and how often to generate summaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Schedule Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Daily Morning Summary"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              {formData.frequency === 'weekly' && (
                <div>
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dayNames.map((day, index) => (
                      <Badge
                        key={index}
                        variant={(formData.daysOfWeek || []).includes(index) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleDayToggle(index)}
                      >
                        {day.slice(0, 3)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div>
                  <Label htmlFor="dayOfMonth">Day of Month</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth || 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Options */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Configuration</CardTitle>
              <CardDescription>
                Customize how your AI summaries are generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Summary Style</Label>
                  <Select
                    value={formData.summaryOptions.style}
                    onValueChange={(value: any) => setFormData(prev => ({
                      ...prev,
                      summaryOptions: { ...prev.summaryOptions, style: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executive Summary</SelectItem>
                      <SelectItem value="detailed">Detailed Analysis</SelectItem>
                      <SelectItem value="bullet_points">Bullet Points</SelectItem>
                      <SelectItem value="action_items">Action Items Focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Summary Length</Label>
                  <Select
                    value={formData.summaryOptions.length}
                    onValueChange={(value: any) => setFormData(prev => ({
                      ...prev,
                      summaryOptions: { ...prev.summaryOptions, length: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Content Days</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.summaryOptions.contentDays}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    summaryOptions: { ...prev.summaryOptions, contentDays: parseInt(e.target.value) }
                  }))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  How many days back to look for content to summarize
                </p>
              </div>

              <div>
                <Label>Focus Areas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {focusOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant={formData.summaryOptions.focus.includes(option.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleFocusToggle(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeActionItems"
                    checked={formData.summaryOptions.includeActionItems}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      summaryOptions: { ...prev.summaryOptions, includeActionItems: !!checked }
                    }))}
                  />
                  <Label htmlFor="includeActionItems">Include Action Items</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includePriority"
                    checked={formData.summaryOptions.includePriority}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      summaryOptions: { ...prev.summaryOptions, includePriority: !!checked }
                    }))}
                  />
                  <Label htmlFor="includePriority">Include Priority Levels</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Methods</CardTitle>
              <CardDescription>
                Choose how you want to receive your automated summaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="telegramEnabled"
                      checked={formData.deliveryMethods.telegram.enabled}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        deliveryMethods: {
                          ...prev.deliveryMethods,
                          telegram: { ...prev.deliveryMethods.telegram, enabled: !!checked }
                        }
                      }))}
                    />
                    <Label htmlFor="telegramEnabled" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Telegram
                    </Label>
                  </div>
                  {telegramPreferences && telegramPreferences.isVerified && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                {formData.deliveryMethods.telegram.enabled && (
                  <div className="ml-6">
                    <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
                    <div className="relative">
                      <Input
                        id="telegramChatId"
                        placeholder={telegramPreferences ? "Using verified chat ID" : "Your Telegram chat ID"}
                        value={formData.deliveryMethods.telegram.chatId || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          deliveryMethods: {
                            ...prev.deliveryMethods,
                            telegram: { ...prev.deliveryMethods.telegram, chatId: e.target.value }
                          }
                        }))}
                        className={telegramPreferences && telegramPreferences.isVerified ? "pr-10" : ""}
                      />
                      {telegramPreferences && telegramPreferences.isVerified && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
                      )}
                    </div>
                    {telegramPreferences && telegramPreferences.isVerified ? (
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Using your verified Telegram chat ID
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        Get your chat ID by messaging @nemory_bot on Telegram
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailEnabled"
                    checked={formData.deliveryMethods.email.enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      deliveryMethods: {
                        ...prev.deliveryMethods,
                        email: { ...prev.deliveryMethods.email, enabled: !!checked }
                      }
                    }))}
                  />
                  <Label htmlFor="emailEnabled">Email</Label>
                </div>

                {formData.deliveryMethods.email.enabled && (
                  <div className="ml-6">
                    <Label htmlFor="emailAddress">Email Address</Label>
                    <Input
                      id="emailAddress"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.deliveryMethods.email.address || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        deliveryMethods: {
                          ...prev.deliveryMethods,
                          email: { ...prev.deliveryMethods.email, address: e.target.value }
                        }
                      }))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Updating...' : 'Update Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditScheduleDialog;