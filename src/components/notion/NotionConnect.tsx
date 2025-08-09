import React, { useState } from 'react';
import { useNotion } from '@/contexts/NotionContext';
import { Link, Unlink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import NotionDebug from './NotionDebug';

const NotionConnect: React.FC = () => {
  const { integration, isConnected, isLoading, connectNotion, disconnectNotion } = useNotion();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    try {
      connectNotion();
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Notion. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnectNotion();
      toast({
        title: "Disconnected Successfully",
        description: "Your Notion workspace has been disconnected from Nemory."
      });
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: "Unable to disconnect from Notion. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-pulse-500" />
          <span className="ml-2 text-gray-600">Loading Notion integration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046 1.121-.466 1.121-1.026V6.354c0-.56-.28-.933-.747-.887l-15.177.887c-.56.047-.934.28-.934.934zm14.337.653c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.888l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.269-.186z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notion Integration</h3>
            <p className="text-gray-600 text-sm">
              {isConnected ? 'Connected and ready to sync' : 'Connect your Notion workspace'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          {isConnected ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-400">
              <AlertCircle className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Not Connected</span>
            </div>
          )}
        </div>
      </div>

      {isConnected && integration ? (
        <div className="space-y-4">
          {/* Workspace Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              {integration.workspaceIcon && (
                <img 
                  src={integration.workspaceIcon} 
                  alt="Workspace" 
                  className="w-8 h-8 rounded"
                />
              )}
              <div>
                <h4 className="font-medium text-gray-900">{integration.workspaceName}</h4>
                <p className="text-sm text-gray-600">
                  Connected on {new Date(integration.connectedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Owner Info */}
          <div className="flex items-center space-x-3">
            {integration.owner.avatar_url && (
              <img 
                src={integration.owner.avatar_url} 
                alt={integration.owner.name} 
                className="w-8 h-8 rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{integration.owner.name}</p>
              <p className="text-xs text-gray-600">{integration.owner.email}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="flex items-center px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4 mr-2" />
              )}
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Your Notion</h4>
            <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
              Link your Notion workspace to start transforming your notes into actionable insights with AI-powered analysis.
            </p>
          </div>
          
          <button
            onClick={handleConnect}
            className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg group"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046 1.121-.466 1.121-1.026V6.354c0-.56-.28-.933-.747-.887l-15.177.887c-.56.047-.934.28-.934.934zm14.337.653c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.888l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.269-.186z"/>
            </svg>
            Connect to Notion
          </button>
          
          <div className="mt-4 text-xs text-gray-500">
            <p>✓ Secure OAuth connection</p>
            <p>✓ Read-only access to your notes</p>
            <p>✓ Disconnect anytime</p>
          </div>
        </div>
      )}
      

    </div>
  );
};

export default NotionConnect;