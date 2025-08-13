import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

const SecureProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireEmailVerification = false 
}) => {
  const { currentUser, loading } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateUser = async () => {
      if (loading) return;
      
      try {
        // Double-check authentication state
        const user = auth.currentUser;
        
        if (!user || !currentUser) {
          setIsValid(false);
          setIsValidating(false);
          return;
        }

        // Verify the user token is still valid
        const token = await user.getIdToken(true); // Force refresh
        if (!token) {
          setIsValid(false);
          setIsValidating(false);
          return;
        }

        // Check email verification if required
        if (requireEmailVerification && !user.emailVerified) {
          setIsValid(false);
          setIsValidating(false);
          return;
        }

        // Additional security checks
        const tokenResult = await user.getIdTokenResult();
        
        // Check if token is not expired
        const now = new Date().getTime() / 1000;
        if (tokenResult.expirationTime && new Date(tokenResult.expirationTime).getTime() / 1000 < now) {
          setIsValid(false);
          setIsValidating(false);
          return;
        }

        setIsValid(true);
        setIsValidating(false);
      } catch (error) {
        console.error('Route validation error:', error);
        setIsValid(false);
        setIsValidating(false);
      }
    };

    validateUser();
  }, [currentUser, loading, requireEmailVerification]);

  // Show loading state while validating
  if (loading || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Redirect if not authenticated or validation failed
  if (!isValid || !currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default SecureProtectedRoute;