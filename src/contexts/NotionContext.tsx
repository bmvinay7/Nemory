import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { notionOAuth, NotionTokenResponse } from '@/lib/notion';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, isFirestoreReady } from '@/lib/firebase';

interface NotionIntegration {
  accessToken: string;
  workspaceName: string;
  workspaceIcon: string;
  workspaceId: string;
  connectedAt: string;
  owner: {
    name: string;
    email: string;
    avatar_url: string;
  };
}

interface NotionContextType {
  integration: NotionIntegration | null;
  isConnected: boolean;
  isLoading: boolean;
  connectNotion: () => void;
  disconnectNotion: () => Promise<void>;
  refreshIntegration: () => Promise<void>;
  handleOAuthCallback: (code: string, state: string) => Promise<NotionIntegration>;
}

const NotionContext = createContext<NotionContextType | undefined>(undefined);

export const useNotion = () => {
  const context = useContext(NotionContext);
  if (context === undefined) {
    throw new Error('useNotion must be used within a NotionProvider');
  }
  return context;
};

export const NotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [integration, setIntegration] = useState<NotionIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  const isConnected = integration !== null;

  // Load existing integration on mount
  useEffect(() => {
    if (currentUser) {
      // Clean up any stale OAuth state on load
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/auth/notion/callback')) {
        // Only clear state if we're not in the callback flow
        const storedState = sessionStorage.getItem('notion_oauth_state');
        if (storedState) {
          try {
            const stateData = JSON.parse(atob(storedState));
            const stateAge = Date.now() - stateData.timestamp;
            // Clear state older than 10 minutes
            if (stateAge > 10 * 60 * 1000) {
              console.log('NotionContext: Clearing expired OAuth state');
              sessionStorage.removeItem('notion_oauth_state');
            }
          } catch (error) {
            console.log('NotionContext: Clearing invalid OAuth state');
            sessionStorage.removeItem('notion_oauth_state');
          }
        }
      }
      
      loadIntegration();
    } else {
      setIntegration(null);
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadIntegration = async () => {
    if (!currentUser) {
      console.log('NotionContext: No current user, skipping integration load');
      setIsLoading(false);
      return;
    }

    try {
      console.log('NotionContext: Loading integration for user:', currentUser.uid);
      setIsLoading(true);
      
      // Check if Firestore is ready, otherwise use localStorage
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'notion_integrations', currentUser.uid);
          console.log('NotionContext: Fetching document from Firestore...');
          
          const docSnap = await getDoc(docRef);
          console.log('NotionContext: Document exists:', docSnap.exists());

          if (docSnap.exists()) {
            const data = docSnap.data() as NotionIntegration;
            console.log('NotionContext: Integration loaded from Firestore:', data.workspaceName);
            setIntegration(data);
            return;
          }
        } catch (firestoreError: any) {
          console.warn('NotionContext: Firestore error, using localStorage fallback:', firestoreError.code);
        }
      } else {
        console.log('NotionContext: Firestore not ready, using localStorage');
      }
      
      // Fallback to localStorage
      const localKey = `notion_integration_${currentUser.uid}`;
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        try {
          const data = JSON.parse(localData) as NotionIntegration;
          console.log('NotionContext: Integration loaded from localStorage:', data.workspaceName);
          setIntegration(data);
          return;
        } catch (parseError) {
          console.error('NotionContext: Failed to parse localStorage data:', parseError);
        }
      }

      console.log('NotionContext: No integration found');
      setIntegration(null);
      
    } catch (error: any) {
      console.error('NotionContext: Error loading integration:', error);
      setIntegration(null);
    } finally {
      console.log('NotionContext: Finished loading integration');
      setIsLoading(false);
    }
  };

  const saveIntegration = async (integrationData: NotionIntegration) => {
    if (!currentUser) return;

    try {
      console.log('NotionContext: Saving integration for user:', currentUser.uid);
      
      // Always save to localStorage for reliability
      const localKey = `notion_integration_${currentUser.uid}`;
      localStorage.setItem(localKey, JSON.stringify(integrationData));
      console.log('NotionContext: Integration saved to localStorage');
      
      // Try to save to Firestore if available
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'notion_integrations', currentUser.uid);
          await setDoc(docRef, integrationData);
          console.log('NotionContext: Integration also saved to Firestore');
        } catch (firestoreError: any) {
          console.warn('NotionContext: Firestore save failed:', firestoreError.code);
        }
      }
      
      setIntegration(integrationData);
    } catch (error: any) {
      console.error('NotionContext: Error saving integration:', error);
      throw error;
    }
  };

  const connectNotion = () => {
    if (!currentUser) return;

    // Clear any existing OAuth state first
    sessionStorage.removeItem('notion_oauth_state');
    
    // Generate a fresh state parameter for security
    const state = btoa(JSON.stringify({
      userId: currentUser.uid,
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7), // Add randomness
    }));

    // Store state in sessionStorage for verification
    sessionStorage.setItem('notion_oauth_state', state);
    console.log('NotionContext: Generated new OAuth state:', state);

    // Redirect to Notion OAuth
    const authUrl = notionOAuth.generateAuthUrl(state);
    console.log('NotionContext: Redirecting to:', authUrl);
    window.location.href = authUrl;
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    if (!currentUser) throw new Error('User not authenticated');

    console.log('NotionContext: Handling OAuth callback');
    console.log('NotionContext: Received state:', state);
    console.log('NotionContext: Received code:', code ? 'present' : 'missing');

    // Check if we already have an integration (connection might have succeeded)
    const existingIntegration = integration;
    if (existingIntegration) {
      console.log('NotionContext: Integration already exists, skipping callback');
      return existingIntegration;
    }

    // Verify state parameter with more flexible validation
    const storedState = sessionStorage.getItem('notion_oauth_state');
    console.log('NotionContext: Stored state:', storedState);
    
    // If no stored state, check if we can validate the state content
    if (!storedState) {
      console.warn('NotionContext: No stored state found, attempting to validate state content');
      try {
        const stateData = JSON.parse(atob(state));
        if (stateData.userId === currentUser.uid) {
          console.log('NotionContext: State validation passed based on user ID');
        } else {
          throw new Error('State user ID mismatch');
        }
      } catch (stateError) {
        console.error('NotionContext: State validation failed:', stateError);
        throw new Error('Invalid state parameter - please try connecting again');
      }
    } else if (state !== storedState) {
      console.error('NotionContext: State mismatch!', { received: state, stored: storedState });
      
      // Try to validate the state content as fallback
      try {
        const receivedStateData = JSON.parse(atob(state));
        const storedStateData = JSON.parse(atob(storedState));
        
        if (receivedStateData.userId === storedStateData.userId && 
            receivedStateData.userId === currentUser.uid) {
          console.log('NotionContext: State content validation passed');
        } else {
          throw new Error('State content validation failed');
        }
      } catch (fallbackError) {
        console.error('NotionContext: Fallback state validation failed:', fallbackError);
        throw new Error('Invalid state parameter - please try connecting again');
      }
    }

    // Clear the state after successful validation
    sessionStorage.removeItem('notion_oauth_state');

    try {
      console.log('NotionContext: Exchanging code for token...');
      // Exchange code for token
      const tokenResponse: NotionTokenResponse = await notionOAuth.exchangeCodeForToken(code);

      // Create integration data
      const integrationData: NotionIntegration = {
        accessToken: tokenResponse.access_token,
        workspaceName: tokenResponse.workspace_name,
        workspaceIcon: tokenResponse.workspace_icon,
        workspaceId: tokenResponse.workspace_id,
        connectedAt: new Date().toISOString(),
        owner: {
          name: tokenResponse.owner.user?.name || 'Unknown',
          email: tokenResponse.owner.user?.person?.email || '',
          avatar_url: tokenResponse.owner.user?.avatar_url || '',
        },
      };

      console.log('NotionContext: Saving integration data...');
      // Save integration
      await saveIntegration(integrationData);

      console.log('NotionContext: OAuth callback completed successfully');
      return integrationData;
    } catch (error: any) {
      console.error('NotionContext: OAuth callback failed:', error);
      throw error;
    }
  };

  const disconnectNotion = async () => {
    if (!currentUser) return;

    try {
      console.log('NotionContext: Disconnecting integration for user:', currentUser.uid);
      
      // Clear all OAuth-related data
      sessionStorage.removeItem('notion_oauth_state');
      
      // Always clean localStorage
      const localKey = `notion_integration_${currentUser.uid}`;
      localStorage.removeItem(localKey);
      console.log('NotionContext: Integration removed from localStorage');
      
      // Try to remove from Firestore if available
      if (isFirestoreReady()) {
        try {
          const docRef = doc(db, 'notion_integrations', currentUser.uid);
          await deleteDoc(docRef);
          console.log('NotionContext: Integration also removed from Firestore');
        } catch (firestoreError: any) {
          console.warn('NotionContext: Firestore delete failed:', firestoreError.code);
        }
      }
      
      setIntegration(null);
      console.log('NotionContext: Disconnection completed');
    } catch (error) {
      console.error('NotionContext: Error disconnecting Notion:', error);
      throw error;
    }
  };

  const refreshIntegration = async () => {
    await loadIntegration();
  };

  const value = {
    integration,
    isConnected,
    isLoading,
    connectNotion,
    disconnectNotion,
    refreshIntegration,
    handleOAuthCallback, // Expose for callback handling
  };

  return (
    <NotionContext.Provider value={value}>
      {children}
    </NotionContext.Provider>
  );
};