import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, LogOut, Settings, FileText, Mail, MessageCircle, BarChart3, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import NotionConnect from './notion/NotionConnect';
import AISummarization from './ai/AISummarization';
import AccountLinking from './auth/AccountLinking';

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pulse-500 to-pulse-600 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
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
                <p className="text-sm font-medium text-gray-900">
                  {currentUser?.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-500">{currentUser?.email}</p>
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
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">
                Welcome back, {currentUser?.displayName?.split(' ')[0] || 'there'}!
              </h2>
              <p className="text-gray-600">
                Your AI-powered notes assistant is ready to help you transform your Notion notes into actionable insights.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-pulse-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-pulse-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-gray-600 text-sm">Notes Processed</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-gray-600 text-sm">Summaries Sent</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-gray-600 text-sm">Action Items</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notion Integration */}
            <NotionConnect />
            
            {/* AI Summarization */}
            <AISummarization />
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <AccountLinking />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;