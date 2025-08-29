import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMetrics } from '@/contexts/MetricsContext';
import { Brain, LogOut, Settings, FileText, Mail, MessageCircle, BarChart3, User, RefreshCw, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/safe-card';
import NotionConnect from './notion/NotionConnect';
import AISummarization from './ai/AISummarization';
import AccountLinking from './auth/AccountLinking';
import TelegramSettings from './telegram/TelegramSettings';
import TelegramConnectionStatus from './telegram/TelegramConnectionStatus';
import ScheduleManager from './schedule/ScheduleManager';

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { metrics, loading: metricsLoading, refreshMetrics } = useMetrics();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'schedules'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "You've been logged out of Nemory."
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRefreshMetrics = async () => {
    setRefreshing(true);
    try {
      await refreshMetrics();
      toast({
        title: "Metrics refreshed",
        description: "Your dashboard metrics have been updated."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not refresh metrics. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src="/nlogo.png" 
                alt="Nemory Logo" 
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="font-display font-bold text-xl text-gray-900">Nemory</h1>
                <p className="text-gray-500 text-xs">AI Notes Assistant</p>
              </div>
            </div>

            {/* Navigation & User Menu */}
            <div className="flex items-center space-x-4">
              {/* Navigation Tabs */}
              <nav className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-pulse-100 text-pulse-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('schedules')}
                  className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'schedules'
                      ? 'bg-pulse-100 text-pulse-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Schedules</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-pulse-100 text-pulse-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </nav>

              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {currentUser?.displayName || 'User'}
                </div>
                <div className="text-xs text-gray-500">{currentUser?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' ? (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">
                    Welcome back, {currentUser?.displayName?.split(' ')[0] || 'there'}!
                  </h2>
                  <p className="text-gray-600">
                    Your AI-powered notes assistant is ready to deliver actionable insights directly to your Telegram.
                  </p>
                </div>
                <button
                  onClick={handleRefreshMetrics}
                  disabled={refreshing || metricsLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-pulse-500 text-white rounded-lg hover:bg-pulse-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-pulse-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-pulse-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {metricsLoading ? (
                          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          metrics.notesProcessed.toLocaleString()
                        )}
                      </div>
                      {!metricsLoading && metrics.notesProcessed > 0 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">Notes Processed</p>
                    {!metricsLoading && metrics.lastUpdated && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last updated: {metrics.lastUpdated.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {metricsLoading ? (
                          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          metrics.summariesSent.toLocaleString()
                        )}
                      </div>
                      {!metricsLoading && metrics.summariesSent > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Delivered
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">Summaries Delivered</p>
                    {!metricsLoading && metrics.summariesSent > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Via Telegram
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {metricsLoading ? (
                          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          metrics.actionItems.toLocaleString()
                        )}
                      </div>
                      {!metricsLoading && metrics.actionItems > 0 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Generated
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">Action Items</p>
                    {!metricsLoading && metrics.actionItems > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        From AI analysis
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions for Testing */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Test the metrics functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      // Note: incrementNotesProcessed function not available in MetricsContext
                      // This won't work directly, we need to use the hook
                      toast({
                        title: "Use the AI Summarization feature",
                        description: "Generate a summary to see metrics update automatically",
                      });
                    }}
                    className="flex items-center space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Process Note</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Use the delivery buttons",
                        description: "Send summaries via Telegram to update metrics",
                      });
                    }}
                    className="flex items-center space-x-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send to Telegram</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Telegram Connection Status */}
            <TelegramConnectionStatus onNavigateToSettings={() => setActiveTab('settings')} />
            
            {/* AI Summarization */}
            <AISummarization />
            
            {/* Notion Integration */}
            <NotionConnect />
          </>
        ) : activeTab === 'schedules' ? (
          <>
            {/* Schedules Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">Automated Schedules</h2>
              <p className="text-gray-600">
                Set up automated AI summaries delivered to your preferred channels.
              </p>
            </div>

            {/* Schedule Manager */}
            <ScheduleManager />
          </>
        ) : (
          <>
            {/* Settings Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">Settings</h2>
              <p className="text-gray-600">
                Manage your account settings and preferences.
              </p>
            </div>

            {/* Settings Content */}
            <div className="space-y-6">
              <TelegramSettings />
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <AccountLinking />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;