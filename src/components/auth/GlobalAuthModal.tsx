import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuthModal } from '@/contexts/AuthModalContext';
import Login from './Login';
import Signup from './Signup';

const GlobalAuthModal: React.FC = () => {
  const { isOpen, mode, closeModal, openModal } = useAuthModal();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeModal}
      />
      
      {/* Modal Container - Always centered and scrollable */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all animate-in fade-in-0 zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={closeModal}
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Content */}
          <div className="p-6 sm:p-8">
            {mode === 'login' ? (
              <Login 
                onSwitchToSignup={() => openModal('signup')}
                onClose={closeModal}
              />
            ) : (
              <Signup 
                onSwitchToLogin={() => openModal('login')}
                onClose={closeModal}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal in a portal to ensure it's at the root level
  return createPortal(modalContent, document.body);
};

export default GlobalAuthModal;