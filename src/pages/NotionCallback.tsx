import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNotion } from '@/contexts/NotionContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const NotionCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { handleOAuthCallback } = useNotion();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Notion connection...');
  
  // Prevent double execution in React strict mode
  const hasProcessed = useRef(false);
  const isProcessing = useRef(false);

  useEffect(() => {
    // Prevent double execution in React 18 strict mode
    if (hasProcessed.current || isProcessing.current) {
      console.log('NotionCallback: Already processed or processing, skipping');
      return;
    }
    
    const handleCallback = async () => {
      // Set processing flag immediately
      isProcessing.current = true;
      
      try {
        console.log('NotionCallback: Starting OAuth callback process');
        console.log('Current user:', currentUser?.uid);
        console.log('Search params:', Object.fromEntries(searchParams.entries()));

        // Check if user is authenticated with retry logic
        if (!currentUser) {
          console.log('NotionCallback: User not authenticated, waiting for auth...');
          
          // Wait for authentication with multiple retries
          let retries = 0;
          const maxRetries = 5;
          const waitForAuth = async (): Promise<boolean> => {
            return new Promise((resolve) => {
              const checkAuth = () => {
                if (currentUser) {
                  console.log('NotionCallback: User authenticated after retry');
                  resolve(true);
                  return;
                }
                
                retries++;
                if (retries >= maxRetries) {
                  console.error('NotionCallback: Authentication timeout after retries');
                  resolve(false);
                  return;
                }
                
                console.log(`NotionCallback: Retry ${retries}/${maxRetries} waiting for auth...`);
                setTimeout(checkAuth, 1000);
              };
              
              checkAuth();
            });
          };
          
          const isAuthenticated = await waitForAuth();
          if (!isAuthenticated) {
            setStatus('error');
            setMessage('Authentication required. Please sign in first.');
            setTimeout(() => navigate('/'), 3000);
            return;
          }
        }

        // Get code and state from URL parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('OAuth parameters:', { code: !!code, state: !!state, error });

        // Handle OAuth errors
        if (error) {
          console.error('NotionCallback: OAuth error from Notion:', error);
          setStatus('error');
          setMessage(`Notion connection failed: ${error}`);
          toast({
            title: "Connection Failed",
            description: `Notion OAuth error: ${error}`,
            variant: "destructive"
          });
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          console.error('NotionCallback: Missing required parameters', { code: !!code, state: !!state });
          setStatus('error');
          setMessage('Invalid callback parameters.');
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }

        // Process the OAuth callback
        console.log('NotionCallback: Processing OAuth callback');
        setMessage('Exchanging authorization code...');
        
        try {
          const integration = await handleOAuthCallback(code, state);
          console.log('NotionCallback: Integration successful', integration.workspaceName);

          setStatus('success');
          setMessage('Notion connected successfully!');
          
          toast({
            title: "Notion Connected! 🎉",
            description: "Your Notion workspace has been successfully connected to Nemory."
          });

          // Redirect to dashboard after success
          setTimeout(() => navigate('/dashboard'), 2000);
        } catch (callbackError: any) {
          console.error('NotionCallback: Detailed error:', {
            message: callbackError.message,
            stack: callbackError.stack,
            name: callbackError.name
          });
          
          // Handle specific error types
          if (callbackError.message?.includes('Invalid state parameter')) {
            console.log('NotionCallback: State validation failed, checking if already connected...');
            setMessage('Verifying connection status...');
            
            // Wait a moment and redirect to dashboard to check connection status
            setTimeout(() => {
              console.log('NotionCallback: Redirecting to dashboard to check connection status');
              navigate('/dashboard');
            }, 1000);
            return;
          }
          
          if (callbackError.message?.includes('Authorization code expired')) {
            setStatus('error');
            setMessage('The authorization code has expired. Please try connecting again.');
            setTimeout(() => navigate('/dashboard'), 3000);
            return;
          }
          
          if (callbackError.message?.includes('Network error') || callbackError.message?.includes('fetch')) {
            setStatus('error');
            setMessage('Connection failed due to network issues. Please check your internet connection and try again.');
            setTimeout(() => navigate('/dashboard'), 4000);
            return;
          }
          
          if (callbackError.message?.includes('CORS')) {
            setStatus('error');
            setMessage('Connection blocked by browser security. This issue has been reported to our team.');
            setTimeout(() => navigate('/dashboard'), 4000);
            return;
          }
          
          // For other errors, throw to be handled by outer catch
          throw callbackError;
        }

      } catch (error: any) {
        console.error('Notion OAuth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect Notion workspace.');
        
        toast({
          title: "Connection Failed",
          description: error.message || "Unable to connect your Notion workspace.",
          variant: "destructive"
        });

        setTimeout(() => navigate('/dashboard'), 3000);
      } finally {
        // Mark as processed to prevent re-execution
        hasProcessed.current = true;
        isProcessing.current = false;
      }
    };

    // Add a small delay to allow all state to initialize properly
    const timeoutId = setTimeout(() => {
      handleCallback();
    }, 100);
    
    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchParams, currentUser, navigate, handleOAuthCallback]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {/* Status Icon */}
        <div className="mb-6">
          {status === 'loading' && (
            <div className="w-16 h-16 bg-pulse-100 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-pulse-500 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'loading' && 'Connecting Notion...'}
          {status === 'success' && 'Connection Successful!'}
          {status === 'error' && 'Connection Failed'}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">{message}</p>

        {/* Notion Logo */}
        <div className="flex items-center justify-center space-x-2 text-gray-400">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046 1.121-.466 1.121-1.026V6.354c0-.56-.28-.933-.747-.887l-15.177.887c-.56.047-.934.28-.934.934zm14.337.653c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.888l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.269-.186z"/>
          </svg>
          <span className="text-sm">Notion Integration</span>
        </div>

        {/* Auto-redirect message */}
        {status !== 'loading' && (
          <p className="text-xs text-gray-500 mt-4">
            Redirecting to dashboard in a few seconds...
          </p>
        )}
      </div>
    </div>
  );
};

export default NotionCallback;