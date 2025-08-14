import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { scheduleStorageService } from '@/lib/schedule-storage';
import { telegramPreferencesService } from '@/lib/telegram-preferences';
import { ScheduleConfig } from '@/lib/schedule-types';
import { toast } from '@/components/ui/use-toast';
import { Clock, Calendar, MessageSquare, Mail, Settings, CheckCircle } from 'lucide-react';

interface CreateScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScheduleCreated: () => void;
}

const CreateScheduleDialog: React.FC<CreateScheduleDialogProps> = ({
    open,
    onOpenChange,
    onScheduleCreated,
}) => {
    const { currentUser } = useAuth();

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [telegramPreferences, setTelegramPreferences] = useState<any>(null);
    const [loadingTelegramPrefs, setLoadingTelegramPrefs] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
        time: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        daysOfWeek: [] as number[],
        dayOfMonth: 1,
        summaryOptions: {
            style: 'executive' as 'executive' | 'detailed' | 'bullet_points' | 'action_items',
            length: 'medium' as 'short' | 'medium' | 'long',
            focus: ['tasks', 'ideas', 'decisions'],
            includeActionItems: true,
            includePriority: true,
            contentDays: 7,
        },
        deliveryMethods: {
            telegram: {
                enabled: false,
                chatId: '',
            },
            email: {
                enabled: false,
                address: '',
            },
        },
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const focusOptions = [
        { value: 'tasks', label: 'Tasks & To-dos' },
        { value: 'ideas', label: 'Ideas & Insights' },
        { value: 'decisions', label: 'Decisions Made' },
        { value: 'meetings', label: 'Meeting Notes' },
        { value: 'projects', label: 'Project Updates' },
        { value: 'learning', label: 'Learning & Research' },
    ];

    // Load Telegram preferences when dialog opens
    useEffect(() => {
        if (open && currentUser) {
            loadTelegramPreferences();
        }
    }, [open, currentUser]);

    const loadTelegramPreferences = async () => {
        if (!currentUser) return;

        try {
            setLoadingTelegramPrefs(true);
            const preferences = await telegramPreferencesService.getUserPreferences(currentUser.uid);

            if (preferences && preferences.isVerified && preferences.chatId) {
                setTelegramPreferences(preferences);

                // Auto-enable Telegram delivery and pre-fill chat ID
                setFormData(prev => ({
                    ...prev,
                    deliveryMethods: {
                        ...prev.deliveryMethods,
                        telegram: {
                            enabled: true,
                            chatId: preferences.chatId,
                        },
                    },
                }));

                console.log('Auto-filled Telegram settings:', {
                    chatId: preferences.chatId,
                    isVerified: preferences.isVerified
                });
            } else {
                setTelegramPreferences(null);
                console.log('No verified Telegram preferences found');
            }
        } catch (error) {
            console.error('Error loading Telegram preferences:', error);
            setTelegramPreferences(null);
        } finally {
            setLoadingTelegramPrefs(false);
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

            if (formData.frequency === 'weekly' && formData.daysOfWeek.length === 0) {
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

            if (formData.deliveryMethods.telegram.enabled && !formData.deliveryMethods.telegram.chatId.trim()) {
                toast({
                    title: 'Validation Error',
                    description: 'Please enter your Telegram chat ID.',
                    variant: 'destructive',
                });
                return;
            }

            // Create schedule
            const schedule: ScheduleConfig = {
                id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: currentUser.uid,
                name: formData.name.trim(),
                isActive: true,
                frequency: formData.frequency,
                time: formData.time,
                timezone: formData.timezone,
                summaryOptions: formData.summaryOptions,
                deliveryMethods: formData.deliveryMethods,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                runCount: 0,
                errorCount: 0,
            };

            // Only add frequency-specific fields when they're needed
            if (formData.frequency === 'weekly') {
                schedule.daysOfWeek = formData.daysOfWeek;
            }
            if (formData.frequency === 'monthly') {
                schedule.dayOfMonth = formData.dayOfMonth;
            }

            await scheduleStorageService.saveSchedule(schedule);

            toast({
                title: 'Schedule Created',
                description: `"${schedule.name}" has been created and activated.`,
            });

            onScheduleCreated();
            onOpenChange(false);
            resetForm();
        } catch (error) {
            console.error('Error creating schedule:', error);
            toast({
                title: 'Error',
                description: 'Failed to create schedule. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setTelegramPreferences(null);
        setFormData({
            name: '',
            frequency: 'daily',
            time: '09:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            daysOfWeek: [],
            dayOfMonth: 1,
            summaryOptions: {
                style: 'executive',
                length: 'medium',
                focus: ['tasks', 'ideas', 'decisions'],
                includeActionItems: true,
                includePriority: true,
                contentDays: 7,
            },
            deliveryMethods: {
                telegram: {
                    enabled: false,
                    chatId: '',
                },
                email: {
                    enabled: false,
                    address: '',
                },
            },
        });
    };

    const handleDayToggle = (dayIndex: number) => {
        const newDays = formData.daysOfWeek.includes(dayIndex)
            ? formData.daysOfWeek.filter(d => d !== dayIndex)
            : [...formData.daysOfWeek, dayIndex];

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
                        <Clock className="h-5 w-5" />
                        Create New Schedule
                    </DialogTitle>
                    <DialogDescription>
                        Set up automated AI summaries delivered to your preferred channels.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center space-x-2">
                        {[1, 2, 3].map((stepNum) => (
                            <div key={stepNum} className="flex items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= stepNum
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                        }`}
                                >
                                    {stepNum}
                                </div>
                                {stepNum < 3 && (
                                    <div
                                        className={`w-12 h-0.5 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Basic Settings */}
                    {step === 1 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Basic Settings
                                </CardTitle>
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
                                                    variant={formData.daysOfWeek.includes(index) ? 'default' : 'outline'}
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
                                            value={formData.dayOfMonth}
                                            onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 2: Summary Options */}
                    {step === 2 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Summary Configuration
                                </CardTitle>
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
                    )}

                    {/* Step 3: Delivery Methods */}
                    {step === 3 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Delivery Methods
                                </CardTitle>
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
                                                    value={formData.deliveryMethods.telegram.chatId}
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

                                <Separator />

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
                                        <Label htmlFor="emailEnabled" className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            Email
                                        </Label>
                                    </div>

                                    {formData.deliveryMethods.email.enabled && (
                                        <div className="ml-6">
                                            <Label htmlFor="emailAddress">Email Address</Label>
                                            <Input
                                                id="emailAddress"
                                                type="email"
                                                placeholder="your@email.com"
                                                value={formData.deliveryMethods.email.address}
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
                    )}
                </div>

                <DialogFooter>
                    <div className="flex justify-between w-full">
                        <div>
                            {step > 1 && (
                                <Button variant="outline" onClick={() => setStep(step - 1)}>
                                    Previous
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            {step < 3 ? (
                                <Button onClick={() => setStep(step + 1)}>
                                    Next
                                </Button>
                            ) : (
                                <Button onClick={handleSubmit} disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Schedule'}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateScheduleDialog;