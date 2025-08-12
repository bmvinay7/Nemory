import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserMetrics {
  notesProcessed: number;
  summariesSent: number;
  actionItems: number;
  lastUpdated: Date;
}

interface MetricsContextType {
  metrics: UserMetrics;
  loading: boolean;
  incrementNotesProcessed: () => Promise<void>;
  incrementSummariesSent: () => Promise<void>;
  incrementActionItems: (count?: number) => Promise<void>;
  refreshMetrics: () => Promise<void>;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (context === undefined) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};

interface MetricsProviderProps {
  children: ReactNode;
}

export const MetricsProvider: React.FC<MetricsProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<UserMetrics>({
    notesProcessed: 0,
    summariesSent: 0,
    actionItems: 0,
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(true);

  // Load metrics when user changes
  useEffect(() => {
    if (currentUser) {
      loadMetrics();
    } else {
      // Reset metrics when user logs out
      setMetrics({
        notesProcessed: 0,
        summariesSent: 0,
        actionItems: 0,
        lastUpdated: new Date()
      });
      setLoading(false);
    }
  }, [currentUser]);

  const loadMetrics = async (retryCount = 0) => {
    if (!currentUser) return;

    // Wait longer for authentication to fully settle, especially on first load
    const waitTime = retryCount === 0 ? 500 : 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    try {
      setLoading(true);
      console.log('MetricsContext: Loading metrics for user:', currentUser.uid, 'attempt:', retryCount + 1);
      
      const metricsRef = doc(db, 'userMetrics', currentUser.uid);
      const metricsSnap = await getDoc(metricsRef);

      if (metricsSnap.exists()) {
        const data = metricsSnap.data();
        console.log('MetricsContext: Loaded existing metrics:', data);
        setMetrics({
          notesProcessed: data.notesProcessed || 0,
          summariesSent: data.summariesSent || 0,
          actionItems: data.actionItems || 0,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        });
      } else {
        console.log('MetricsContext: No existing metrics, creating initial document');
        // Initialize metrics for new user
        const initialMetrics = {
          notesProcessed: 0,
          summariesSent: 0,
          actionItems: 0,
          lastUpdated: new Date()
        };
        await setDoc(metricsRef, initialMetrics);
        setMetrics(initialMetrics);
      }
    } catch (error: any) {
      console.error('Error loading metrics:', error);
      
      // Handle different error types
      if (error.code === 'permission-denied') {
        console.log('MetricsContext: Permission denied - user may not be fully authenticated yet');
        
        // Retry once after a longer delay if this is the first attempt
        if (retryCount === 0) {
          console.log('MetricsContext: Retrying after permission denied...');
          setTimeout(() => loadMetrics(1), 2000);
          return;
        }
        
        // Use default values after retry fails
        console.log('MetricsContext: Using default values after retry failed');
        setMetrics({
          notesProcessed: 0,
          summariesSent: 0,
          actionItems: 0,
          lastUpdated: new Date()
        });
      } else if (error.code === 'unavailable') {
        console.log('MetricsContext: Firebase unavailable - using default values');
        setMetrics({
          notesProcessed: 0,
          summariesSent: 0,
          actionItems: 0,
          lastUpdated: new Date()
        });
      } else {
        console.error('MetricsContext: Unexpected error:', error);
        setMetrics({
          notesProcessed: 0,
          summariesSent: 0,
          actionItems: 0,
          lastUpdated: new Date()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const incrementNotesProcessed = async () => {
    if (!currentUser) return;

    // Update local state immediately for better UX
    setMetrics(prev => ({
      ...prev,
      notesProcessed: prev.notesProcessed + 1,
      lastUpdated: new Date()
    }));

    try {
      const metricsRef = doc(db, 'userMetrics', currentUser.uid);
      await updateDoc(metricsRef, {
        notesProcessed: increment(1),
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error incrementing notes processed:', error);
      // Revert local state if Firebase update fails
      if (error.code === 'unavailable') {
        // Don't revert for offline errors - keep local state
        console.log('Offline: metrics will sync when connection is restored');
      } else {
        setMetrics(prev => ({
          ...prev,
          notesProcessed: prev.notesProcessed - 1,
        }));
      }
    }
  };

  const incrementSummariesSent = async () => {
    if (!currentUser) return;

    // Update local state immediately for better UX
    setMetrics(prev => ({
      ...prev,
      summariesSent: prev.summariesSent + 1,
      lastUpdated: new Date()
    }));

    try {
      const metricsRef = doc(db, 'userMetrics', currentUser.uid);
      await updateDoc(metricsRef, {
        summariesSent: increment(1),
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error incrementing summaries sent:', error);
      // Revert local state if Firebase update fails
      if (error.code === 'unavailable') {
        // Don't revert for offline errors - keep local state
        console.log('Offline: metrics will sync when connection is restored');
      } else {
        setMetrics(prev => ({
          ...prev,
          summariesSent: prev.summariesSent - 1,
        }));
      }
    }
  };

  const incrementActionItems = async (count: number = 1) => {
    if (!currentUser) return;

    // Update local state immediately for better UX
    setMetrics(prev => ({
      ...prev,
      actionItems: prev.actionItems + count,
      lastUpdated: new Date()
    }));

    try {
      const metricsRef = doc(db, 'userMetrics', currentUser.uid);
      await updateDoc(metricsRef, {
        actionItems: increment(count),
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error incrementing action items:', error);
      // Revert local state if Firebase update fails
      if (error.code === 'unavailable') {
        // Don't revert for offline errors - keep local state
        console.log('Offline: metrics will sync when connection is restored');
      } else {
        setMetrics(prev => ({
          ...prev,
          actionItems: prev.actionItems - count,
        }));
      }
    }
  };

  const refreshMetrics = async () => {
    await loadMetrics();
  };

  const value: MetricsContextType = {
    metrics,
    loading,
    incrementNotesProcessed,
    incrementSummariesSent,
    incrementActionItems,
    refreshMetrics
  };

  return (
    <MetricsContext.Provider value={value}>
      {children}
    </MetricsContext.Provider>
  );
};