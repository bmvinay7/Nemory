import React from 'react';

const EnvDebug: React.FC = () => {
  const envVars = {
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    VITE_NOTION_CLIENT_ID: import.meta.env.VITE_NOTION_CLIENT_ID,
    VITE_NOTION_CLIENT_SECRET: import.meta.env.VITE_NOTION_CLIENT_SECRET ? '[SET]' : '[NOT SET]',
    VITE_NOTION_REDIRECT_URI: import.meta.env.VITE_NOTION_REDIRECT_URI,
    VITE_NOTION_REDIRECT_URI_PROD: import.meta.env.VITE_NOTION_REDIRECT_URI_PROD,
  };

  return (
    <div className="bg-gray-100 rounded-lg p-4 mt-4">
      <h4 className="font-medium text-gray-900 mb-3">Environment Variables Debug</h4>
      <pre className="text-xs text-gray-700 bg-white p-3 rounded border overflow-auto">
        {JSON.stringify(envVars, null, 2)}
      </pre>
    </div>
  );
};

export default EnvDebug;
