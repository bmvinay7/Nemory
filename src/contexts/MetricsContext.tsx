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

  const loadMetrics = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const metricsRef = doc(db, 'userMetrics', currentUser.uid);
      const metricsSnap = await getDoc(metricsRef);

      if (metricsSnap.exists()) {
        const data = metricsSnap.data();
        setMetrics({
          notesProcessed: data.notesProcessed || 0,
          summariesSent: data.summariesSent || 0,
          actionItems: data.actionItems || 0,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        });
      } else {
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
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementNotesProcessed = async () => {
    if (!currentUser) return;

    try {
      const metricsRef = doc(db, 'userMetrics', currentUser.uid);
      await updateDoc(metricsRef, {
        notesProcessed: increment(1),
        lastUpdated: new Date()
      });

      // Update local state
      setMetrics(prev => ({
        ...prev,
        notesProcessed: prev.notesProcessed + 1,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error incrementing notes processed:', error);
    }
  };

  const incrementSummariesSent = async () => {
    if (!currentUser) return;

    try {
      const metricsRef = doc(db, 'userMetrics', currentUser.uid);
      await updateDoc(metricsRef, {
        summariesSent: increment(1),
        lastUpdated: new Date()
      });

      // Update local state
      setMetrics(prev => ({
        ...prev,
        summariesSent: prev.summariesSent + 1,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error incrementing summaries sent:', error);
    }
  };

  const incrementActionItems = async (count: number = 1) => {
    if (!currentUser) return;

    try {
      const metricsRef = doc(db, 'userMetrics', currentUser.uid);
      await updateDoc(metricsRef, {
        actionItems: increment(count),
        lastUpdated: new Date()
      });

      // Update local state
      setMetrics(prev => ({
        ...prev,
        actionItems: prev.actionItems + count,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error incrementing action items:', error);
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