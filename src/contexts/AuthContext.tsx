import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  linkWithCredential,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  linkEmailPassword: (email: string, password: string) => Promise<void>;
  checkExistingMethods: (email: string) => Promise<string[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
  };

  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      return result;
    } catch (error: any) {
      // Handle account linking scenarios
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        if (email) {
          // Get existing sign-in methods for this email
          const methods = await fetchSignInMethodsForEmail(auth, email);
          
          // Create a more specific error with linking information
          const linkingError = new Error('Account linking required');
          (linkingError as any).code = 'auth/account-exists-with-different-credential';
          (linkingError as any).email = email;
          (linkingError as any).existingMethods = methods;
          (linkingError as any).pendingCredential = error.credential;
          throw linkingError;
        }
      }
      throw error;
    }
  };

  const resetPassword = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const checkExistingMethods = async (email: string): Promise<string[]> => {
    try {
      return await fetchSignInMethodsForEmail(auth, email);
    } catch (error) {
      console.error('Error checking existing methods:', error);
      return [];
    }
  };

  const linkEmailPassword = async (email: string, password: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(currentUser, credential);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    loginWithGoogle,
    resetPassword,
    linkEmailPassword,
    checkExistingMethods
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};