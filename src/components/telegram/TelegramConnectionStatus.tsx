import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/safe-card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Settings, ExternalLink, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TelegramPreferences {
  chatId: string;
  isVerified: boolean;
  botUsername?: string;
  lastTestSent?: string;
  createdAt: string;
  updatedAt: string;
}

interface TelegramConnectionStatusProps {
  onNavigateToSettings: () => void;
}

const TelegramConnectionStatus: React.FC<TelegramConnectionStatusProps> = ({ onNavigateToSettings }) => {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState<TelegramPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [botInfo, setBotInfo] = useState<any>(null);

  useEffect(() => {
    console.log('TelegramConnectionStatus: useEffect triggered, currentUser:', currentUser?.uid);
    if (currentUser) {
      loadPreferences();
      loadBotInfo();
    } else {
      console.log('TelegramConnectionStatus: No current user, resetting state');
      setPreferences(null);
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadPreferences = async (retryCount = 0) => {
    if (!currentUser) {
      console.log('TelegramConnectionStatus: No current user, skipping load');
      setIsLoading(false);
      return;
    }

    // Wait longer for authentication to fully settle, especially on first load
    const waitTime = retryCount === 0 ? 500 : 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    try {
      setIsLoading(true);
      console.log('TelegramConnectionStatus: Loading preferences for user:', currentUser.uid, 'attempt:', retryCount + 1);
      
      const prefsRef = doc(db, 'telegramPreferences', currentUser.uid);
      const prefsSnap = await getDoc(prefsRef);

      if (prefsSnap.exists()) {
        const data = prefsSnap.data() as TelegramPreferences;
        console.log('TelegramConnectionStatus: Loaded preferences:', data);
        setPreferences(data);
      } else {
        console.log('TelegramConnectionStatus: No preferences document found');
        setPreferences(null);
      }
    } catch (error: any) {
      console.error('TelegramConnectionStatus: Failed to load preferences:', error);
      
      // Handle different error types
      if (error.code === 'permission-denied') {
        console.log('TelegramConnectionStatus: Permission denied - user may not be fully authenticated yet');
        
        // Retry once after a longer delay if this is the first attempt
        if (retryCount === 0) {
          console.log('TelegramConnectionStatus: Retrying after permission denied...');
          setTimeout(() => loadPreferences(1), 2000);
          return;
        }
        
        console.log('TelegramConnectionStatus: Using null preferences after retry failed');
        setPreferences(null);
      } else if (error.code === 'unavailable') {
        console.log('TelegramConnectionStatus: Firebase unavailable - will retry when online');
        setPreferences(null);
      } else {
        console.error('TelegramConnectionStatus: Unexpected error:', error);
        setPreferences(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadBotInfo = async () => {
    try {
      // Import dynamically to avoid issues if telegram client is not configured
      const { telegramClientService } = await import('@/lib/telegram-client');
      if (telegramClientService.isConfigured()) {
        const info = await telegramClientService.getBotInfo();
        setBotInfo(info);
      }
    } catch (error) {
      console.error('Failed to load bot info:', error);
      // Don't set bot info if there's an error - component will handle gracefully
    }
  };

  const isConnected = preferences && preferences.chatId && preferences.isVerified;
  const isPartiallyConfigured = preferences && preferences.chatId && !preferences.isVerified;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-5 h-5 text-blue-500 animate-pulse" />
            <span className="text-gray-600">Checking Telegram connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Telegram Delivery</CardTitle>
              <CardDescription>
                Get AI summaries delivered directly to Telegram
              </CardDescription>
            </div>
          </div>
          
          {/* Connection Status Badge */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : isPartiallyConfigured ? (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Setup Required
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isConnected ? (
          /* Connected State */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Telegram Connected</p>
                  <p className="text-sm text-green-700">
                    Chat ID: {preferences.chatId} • Verified ✓
                  </p>
                </div>
              </div>
              {botInfo && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`https://t.me/${botInfo.username}`, '_blank')}
                  className="flex items-center space-x-1 border-green-300 text-green-700 hover:bg-green-100"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Chat</span>
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {preferences.lastTestSent 
                  ? `Last verified: ${new Date(preferences.lastTestSent).toLocaleDateString()}`
                  : 'Ready to receive summaries'
                }
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={onNavigateToSettings}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Settings className="w-4 h-4 mr-1" />
                Manage
              </Button>
            </div>
          </div>
        ) : isPartiallyConfigured ? (
          /* Partially Configured State */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">Verification Required</p>
                  <p className="text-sm text-yellow-700">
                    Chat ID saved but not verified yet
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Complete Setup:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside mb-3">
                <li>Go to Settings → Telegram Delivery</li>
                <li>Click "Send Test" to verify your connection</li>
                <li>Check your Telegram for the test message</li>
              </ol>
              <Button
                onClick={onNavigateToSettings}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Complete Setup
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          /* Not Connected State */
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Connect Telegram</h3>
              <p className="text-gray-600 text-sm mb-4 max-w-md mx-auto">
                Get your AI summaries delivered instantly to Telegram. Never miss important insights from your notes.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Quick Setup Guide:
              </h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside mb-4">
                <li>Message our Telegram bot to get your Chat ID</li>
                <li>Go to Settings and paste your Chat ID</li>
                <li>Send a test message to verify connection</li>
                <li>Start receiving AI summaries!</li>
              </ol>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (botInfo?.username) {
                      window.open(`https://t.me/${botInfo.username}`, '_blank');
                    } else {
                      // Fallback - direct user to settings where they can find bot info
                      onNavigateToSettings();
                    }
                  }}
                  className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {botInfo?.username ? 'Message Bot' : 'Find Bot'}
                </Button>
                <Button
                  onClick={onNavigateToSettings}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                ✓ Instant delivery • ✓ Secure connection • ✓ Easy setup
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramConnectionStatus;