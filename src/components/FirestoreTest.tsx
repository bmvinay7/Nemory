import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, isFirestoreReady } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export const FirestoreTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Testing...');
  const [details, setDetails] = useState<string[]>([]);
  const { currentUser } = useAuth();

  const addDetail = (detail: string) => {
    setDetails(prev => [...prev, `${new Date().toLocaleTimeString()}: ${detail}`]);
  };

  const testFirestore = async () => {
    if (!currentUser) {
      setStatus('❌ No authenticated user');
      return;
    }

    try {
      addDetail('Starting Firestore test...');
      
      // Check if Firestore is ready
      const ready = isFirestoreReady();
      addDetail(`Firestore ready: ${ready}`);
      
      if (!ready) {
        setStatus('⚠️ Firestore not ready, using localStorage fallback');
        return;
      }

      // Test write
      const testDoc = doc(db, 'test', currentUser.uid);
      const testData = {
        message: 'Hello from Nemory!',
        timestamp: new Date().toISOString(),
        userId: currentUser.uid
      };
      
      addDetail('Attempting to write test document...');
      await setDoc(testDoc, testData);
      addDetail('✅ Write successful');

      // Test read
      addDetail('Attempting to read test document...');
      const docSnap = await getDoc(testDoc);
      
      if (docSnap.exists()) {
        addDetail('✅ Read successful');
        addDetail(`Data: ${JSON.stringify(docSnap.data())}`);
        setStatus('✅ Firestore working correctly!');
      } else {
        addDetail('❌ Document not found after write');
        setStatus('❌ Read test failed');
      }

    } catch (error: any) {
      addDetail(`❌ Error: ${error.code || error.message}`);
      setStatus(`❌ Firestore test failed: ${error.code || error.message}`);
    }
  };

  useEffect(() => {
    if (currentUser) {
      testFirestore();
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please log in to test Firestore connection</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Firestore Connection Test</h3>
      <p className="mb-4 font-medium">{status}</p>
      
      <div className="space-y-1 text-sm text-gray-600 max-h-40 overflow-y-auto">
        {details.map((detail, index) => (
          <div key={index} className="font-mono text-xs">
            {detail}
          </div>
        ))}
      </div>
      
      <button
        onClick={testFirestore}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Again
      </button>
    </div>
  );
};