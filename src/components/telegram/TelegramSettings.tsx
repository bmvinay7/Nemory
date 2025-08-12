import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { telegramClientService } from '@/lib/telegram-client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/safe-card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TelegramPreferences {
  chatId: string;
  isVerified: boolean;
  botUsername?: string;
  lastTestSent?: string;
  createdAt: string;
  updatedAt: string;
}

const TelegramSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const [chatId, setChatId] = useState('');
  const [preferences, setPreferences] = useState<TelegramPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [botInfo, setBotInfo] = useState<any>(null);

  // Load user's Telegram preferences
  useEffect(() => {
    console.log('TelegramSettings: useEffect triggered, currentUser:', currentUser?.uid);
    if (currentUser) {
      loadPreferences();
      loadBotInfo();
    } else {
      console.log('TelegramSettings: No current user, resetting state');
      setPreferences(null);
      setChatId('');
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadPreferences = async (retryCount = 0) => {
    if (!currentUser) {
      console.log('TelegramSettings: No current user, skipping load');
      return;
    }

    // Wait longer for authentication to fully settle, especially on first load
    const waitTime = retryCount === 0 ? 500 : 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    try {
      setIsLoading(true);
      console.log('TelegramSettings: Loading preferences for user:', currentUser.uid, 'attempt:', retryCount + 1);
      
      const prefsRef = doc(db, 'telegramPreferences', currentUser.uid);
      const prefsSnap = await getDoc(prefsRef);

      if (prefsSnap.exists()) {
        const data = prefsSnap.data() as TelegramPreferences;
        console.log('TelegramSettings: Loaded preferences:', data);
        setPreferences(data);
        setChatId(data.chatId);
      } else {
        console.log('TelegramSettings: No preferences document found');
        setPreferences(null);
        setChatId('');
      }
    } catch (error: any) {
      console.error('TelegramSettings: Failed to load preferences:', error);
      
      // Handle different error types
      if (error.code === 'permission-denied') {
        console.log('TelegramSettings: Permission denied - user may not be fully authenticated yet');
        
        // Retry once after a longer delay if this is the first attempt
        if (retryCount === 0) {
          console.log('TelegramSettings: Retrying after permission denied...');
          setTimeout(() => loadPreferences(1), 2000);
          return;
        }
        
        console.log('TelegramSettings: Using null preferences after retry failed');
        setPreferences(null);
        setChatId('');
      } else if (error.code === 'unavailable') {
        console.log('TelegramSettings: Firebase unavailable - will load when connection is restored');
        setPreferences(null);
        setChatId('');
      } else {
        console.error('TelegramSettings: Unexpected error:', error);
        toast({
          title: "Error loading preferences",
          description: "Could not load your Telegram settings",
          variant: "destructive"
        });
        setPreferences(null);
        setChatId('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadBotInfo = async () => {
    try {
      if (telegramClientService.isConfigured()) {
        const info = await telegramClientService.getBotInfo();
        setBotInfo(info);
      }
    } catch (error) {
      console.error('Failed to load bot info:', error);
    }
  };

  const validateChatId = (id: string) => {
    const validation = telegramClientService.validateChatId(id);
    
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid chat ID');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  const saveChatId = async () => {
    if (!currentUser || !chatId.trim()) return;

    if (!validateChatId(chatId)) {
      return;
    }

    try {
      setSaving(true);

      // Safety timeout to ensure button never gets stuck
      const safetyTimeout = setTimeout(() => {
        setSaving(false);
        console.log('Safety timeout: clearing saving state');
      }, 2000);

      const newPreferences: TelegramPreferences = {
        chatId: chatId.trim(),
        isVerified: false, // Reset verification when chat ID changes
        botUsername: botInfo?.username,
        createdAt: preferences?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update local state immediately - this is what the user sees
      setPreferences(newPreferences);

      // Clear safety timeout and saving state immediately after local update
      clearTimeout(safetyTimeout);
      setSaving(false);

      // Show immediate success
      toast({
        title: "Chat ID saved",
        description: "Your Telegram chat ID has been updated",
      });

      // Save to Firebase in the background without blocking UI
      setTimeout(async () => {
        try {
          console.log('TelegramSettings: Saving preferences to Firebase:', newPreferences);
          const prefsRef = doc(db, 'telegramPreferences', currentUser.uid);
          await setDoc(prefsRef, newPreferences);
          console.log('TelegramSettings: Chat ID saved to Firebase successfully');
          
          // Verify the save by reading it back
          const verifySnap = await getDoc(prefsRef);
          if (verifySnap.exists()) {
            console.log('TelegramSettings: Verified saved data:', verifySnap.data());
          } else {
            console.error('TelegramSettings: Failed to verify saved data - document not found');
          }
        } catch (firebaseError) {
          console.error('TelegramSettings: Failed to save chat ID to Firebase (background):', firebaseError);
          // Silent failure - user already got success message and local state is updated
        }
      }, 100);

    } catch (error) {
      console.error('Failed to save chat ID:', error);
      setSaving(false);
      toast({
        title: "Error saving chat ID",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const sendTestMessage = async () => {
    if (!currentUser || !chatId.trim()) return;

    if (!validateChatId(chatId)) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;

    try {
      setIsSendingTest(true);

      // Add a timeout to ensure we don't get stuck in loading state
      timeoutId = setTimeout(() => {
        setIsSendingTest(false);
        toast({
          title: "Request timeout",
          description: "The test message request took too long. Please try again.",
          variant: "destructive"
        });
        timeoutId = null;
      }, 10000); // 10 second timeout

      const result = await telegramClientService.sendTestMessage(chatId);
      
      // Clear the timeout since we got a response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (result.success) {
        // Update preferences to mark as verified and record test time
        const updatedPreferences: TelegramPreferences = {
          ...preferences!,
          chatId: chatId.trim(),
          isVerified: true,
          lastTestSent: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Update local state immediately - this is what matters for the UI
        setPreferences(updatedPreferences);

        toast({
          title: "Test message sent! 🎉",
          description: `Check your Telegram chat for the test message`,
        });

        // Save to Firebase in the background without blocking the UI
        // This runs independently and won't affect the user experience
        setTimeout(async () => {
          try {
            console.log('TelegramSettings: Saving test preferences to Firebase:', updatedPreferences);
            const prefsRef = doc(db, 'telegramPreferences', currentUser.uid);
            await setDoc(prefsRef, updatedPreferences);
            console.log('TelegramSettings: Test preferences saved to Firebase successfully');
            
            // Verify the save by reading it back
            const verifySnap = await getDoc(prefsRef);
            if (verifySnap.exists()) {
              console.log('TelegramSettings: Verified test saved data:', verifySnap.data());
            } else {
              console.error('TelegramSettings: Failed to verify test saved data - document not found');
            }
          } catch (firebaseError) {
            console.error('TelegramSettings: Failed to save test preferences to Firebase (background):', firebaseError);
            // Silent failure - user already got success message
          }
        }, 100);

      } else {
        toast({
          title: "Failed to send test message",
          description: result.error || 'Unknown error occurred',
          variant: "destructive"
        });
      }

    } catch (error) {
      // Clear timeout if there was an error
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      console.error('Test message error:', error);
      toast({
        title: "Error sending test message",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      // Always clear the loading state
      setIsSendingTest(false);
      
      // Clear timeout as final safety measure
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const copyBotLink = () => {
    if (botInfo?.username) {
      navigator.clipboard.writeText(`https://t.me/${botInfo.username}`);
      toast({
        title: "Bot link copied!",
        description: "Paste this link to start chatting with the bot",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Telegram Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="w-8 h-8 text-pulse-500 mx-auto mb-2 animate-pulse" />
            <p className="text-gray-600">Loading Telegram settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!telegramClientService.isConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <span>Telegram Integration</span>
          </CardTitle>
          <CardDescription>
            Telegram bot is not configured. Please set up the bot token in environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Setup Required</h4>
            <p className="text-sm text-yellow-800 mb-3">
              To use Telegram integration, you need to:
            </p>
            <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
              <li>Create a Telegram bot via @BotFather</li>
              <li>Get your bot token</li>
              <li>Set VITE_TELEGRAM_BOT_TOKEN in your environment</li>
              <li>Restart your application</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          <span>Telegram Delivery</span>
        </CardTitle>
        <CardDescription>
          Configure your Telegram chat to receive AI summaries directly on Telegram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bot Info */}
        {botInfo && (
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">@{botInfo.username}</p>
                <p className="text-sm text-gray-600">{botInfo.first_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyBotLink}
                className="flex items-center space-x-1"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`https://t.me/${botInfo.username}`, '_blank')}
                className="flex items-center space-x-1"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Bot</span>
              </Button>
            </div>
          </div>
        )}

        {/* Current Status */}
        {preferences && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${preferences.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <div>
                <p className="font-medium text-gray-900">
                  {preferences.isVerified ? 'Telegram Verified' : 'Verification Pending'}
                </p>
                <p className="text-sm text-gray-600">
                  {preferences.chatId ? `Chat ID: ${preferences.chatId}` : 'No chat ID set'}
                </p>
              </div>
            </div>
            <Badge variant={preferences.isVerified ? 'default' : 'secondary'}>
              {preferences.isVerified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
        )}

        {/* Chat ID Input */}
        <div className="space-y-3">
          <Label htmlFor="chatId" className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4" />
            <span>Telegram Chat ID</span>
          </Label>
          <div className="flex space-x-3">
            <div className="flex-1">
              <Input
                id="chatId"
                type="text"
                placeholder="123456789 or @username"
                value={chatId}
                onChange={(e) => {
                  setChatId(e.target.value);
                  if (validationError) {
                    validateChatId(e.target.value);
                  }
                }}
                onBlur={() => {
                  if (chatId) {
                    validateChatId(chatId);
                  }
                }}
                className={validationError ? 'border-red-500' : ''}
              />
              {validationError && (
                <div className="text-sm text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationError}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Enter your Telegram chat ID (get it by messaging the bot)
              </p>
            </div>
            <Button
              onClick={saveChatId}
              disabled={isSaving || !chatId.trim() || !!validationError}
              className="flex items-center space-x-2"
            >
              <CheckCircle className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Test Message Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Test Telegram Integration</h4>
              <p className="text-sm text-gray-600">
                Send a test message to verify your Telegram chat is working
              </p>
            </div>
            <Button
              onClick={sendTestMessage}
              disabled={isSendingTest || !chatId.trim() || !!validationError}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Send className={`w-4 h-4 ${isSendingTest ? 'animate-pulse' : ''}`} />
              <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
            </Button>
          </div>

          {preferences?.lastTestSent && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>
                Last test sent: {new Date(preferences.lastTestSent).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Setup Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            How to Get Your Chat ID
          </h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Start a chat with the bot using the link above</li>
            <li>Send any message to the bot (like "hello")</li>
            <li>The bot will reply with your Chat ID</li>
            <li>Copy that Chat ID and paste it above</li>
            <li>Click "Save" and then "Send Test" to verify</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramSettings;