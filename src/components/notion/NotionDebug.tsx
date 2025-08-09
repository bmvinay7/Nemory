import React from 'react';
import { useNotion } from '@/contexts/NotionContext';
import { notionOAuth } from '@/lib/notion';

const NotionDebug: React.FC = () => {
  const { integration, isConnected } = useNotion();

  const debugInfo = {
    clientId: import.meta.env.VITE_NOTION_CLIENT_ID,
    redirectUri: import.meta.env.VITE_NOTION_REDIRECT_URI,
    hasClientSecret: !!import.meta.env.VITE_NOTION_CLIENT_SECRET,
    isConnected,
    integration: integration ? {
      workspaceName: integration.workspaceName,
      workspaceId: integration.workspaceId,
      connectedAt: integration.connectedAt,
      ownerName: integration.owner.name,
      ownerEmail: integration.owner.email,
    } : null,
  };

  const testAuthUrl = () => {
    const authUrl = notionOAuth.generateAuthUrl('test-state');
    console.log('Generated Auth URL:', authUrl);
    return authUrl;
  };

  return (
    <div className="bg-gray-100 rounded-lg p-4 mt-4">
      <h4 className="font-medium text-gray-900 mb-3">Debug Information</h4>
      <pre className="text-xs text-gray-700 bg-white p-3 rounded border overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <div className="mt-3">
        <button
          onClick={() => {
            const url = testAuthUrl();
            navigator.clipboard.writeText(url);
            alert('Auth URL copied to clipboard!');
          }}
          className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          Copy Test Auth URL
        </button>
      </div>
    </div>
  );
};

export default NotionDebug;