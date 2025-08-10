import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Link, Unlink, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { GoogleAuthProvider, linkWithPopup, unlink, EmailAuthProvider, linkWithCredential } from 'firebase/auth';

const AccountLinking: React.FC = () => {
  const { currentUser, linkEmailPassword } = useAuth();
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailFormData, setEmailFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      // Get currently linked providers
      const providers = currentUser.providerData.map(provider => provider.providerId);
      setLinkedProviders(providers);
    }
  }, [currentUser]);

  const handleLinkGoogle = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await linkWithPopup(currentUser, provider);
      
      // Update linked providers
      const providers = currentUser.providerData.map(provider => provider.providerId);
      setLinkedProviders(providers);
      
      toast({
        title: "Google Account Linked! 🎉",
        description: "You can now sign in with Google using the same account."
      });
    } catch (error: any) {
      let errorMessage = "Failed to link Google account. Please try again.";
      
      if (error.code === 'auth/credential-already-in-use') {
        errorMessage = "This Google account is already linked to another user account.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Linking cancelled. Please try again.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup blocked. Please allow popups and try again.";
      }
      
      toast({
        title: "Linking Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!currentUser) return;

    // Check if user has other sign-in methods
    if (linkedProviders.length <= 1) {
      toast({
        title: "Cannot Unlink",
        description: "You must have at least one sign-in method linked to your account.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await unlink(currentUser, GoogleAuthProvider.PROVIDER_ID);
      
      // Update linked providers
      const providers = currentUser.providerData.map(provider => provider.providerId);
      setLinkedProviders(providers);
      
      toast({
        title: "Google Account Unlinked",
        description: "Google sign-in has been removed from your account."
      });
    } catch (error: any) {
      toast({
        title: "Unlinking Failed",
        description: "Failed to unlink Google account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailFormData.email || !emailFormData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    if (emailFormData.password !== emailFormData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive"
      });
      return;
    }

    if (emailFormData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await linkEmailPassword(emailFormData.email, emailFormData.password);
      
      // Update linked providers
      if (currentUser) {
        const providers = currentUser.providerData.map(provider => provider.providerId);
        setLinkedProviders(providers);
      }
      
      setShowEmailForm(false);
      setEmailFormData({ email: '', password: '', confirmPassword: '' });
      
      toast({
        title: "Email/Password Linked! 🎉",
        description: "You can now sign in with email and password."
      });
    } catch (error: any) {
      let errorMessage = "Failed to link email/password. Please try again.";
      
      if (error.code === 'auth/credential-already-in-use') {
        errorMessage = "This email is already linked to another account.";
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already in use by another account.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }
      
      toast({
        title: "Linking Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkEmailPassword = async () => {
    if (!currentUser) return;

    // Check if user has other sign-in methods
    if (linkedProviders.length <= 1) {
      toast({
        title: "Cannot Unlink",
        description: "You must have at least one sign-in method linked to your account.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await unlink(currentUser, EmailAuthProvider.PROVIDER_ID);
      
      // Update linked providers
      const providers = currentUser.providerData.map(provider => provider.providerId);
      setLinkedProviders(providers);
      
      toast({
        title: "Email/Password Unlinked",
        description: "Email/password sign-in has been removed from your account."
      });
    } catch (error: any) {
      toast({
        title: "Unlinking Failed",
        description: "Failed to unlink email/password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isGoogleLinked = linkedProviders.includes('google.com');
  const isEmailLinked = linkedProviders.includes('password');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Linking</h3>
        <p className="text-gray-600 text-sm mb-6">
          Link multiple sign-in methods to your account for easier access. You can sign in with any linked method.
        </p>
      </div>

      {/* Google Account Linking */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Google</h4>
              <p className="text-sm text-gray-600">
                {isGoogleLinked ? 'Linked to your account' : 'Not linked'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isGoogleLinked ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <button
                  onClick={handleUnlinkGoogle}
                  disabled={loading}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                >
                  <Unlink className="w-4 h-4" />
                  <span>Unlink</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleLinkGoogle}
                disabled={loading}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-pulse-600 hover:text-pulse-700 hover:bg-pulse-50 rounded-md transition-colors disabled:opacity-50"
              >
                <Link className="w-4 h-4" />
                <span>Link</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Email/Password Account Linking */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Email & Password</h4>
              <p className="text-sm text-gray-600">
                {isEmailLinked ? 'Linked to your account' : 'Not linked'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEmailLinked ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <button
                  onClick={handleUnlinkEmailPassword}
                  disabled={loading}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                >
                  <Unlink className="w-4 h-4" />
                  <span>Unlink</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowEmailForm(true)}
                disabled={loading}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-pulse-600 hover:text-pulse-700 hover:bg-pulse-50 rounded-md transition-colors disabled:opacity-50"
              >
                <Link className="w-4 h-4" />
                <span>Link</span>
              </button>
            )}
          </div>
        </div>

        {/* Email/Password Linking Form */}
        {showEmailForm && !isEmailLinked && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <form onSubmit={handleLinkEmailPassword} className="space-y-4">
              <div>
                <label htmlFor="link-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="link-email"
                    type="email"
                    value={emailFormData.email}
                    onChange={(e) => setEmailFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pulse-500 focus:border-transparent text-sm"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="link-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="link-password"
                    type={showPassword ? 'text' : 'password'}
                    value={emailFormData.password}
                    onChange={(e) => setEmailFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pulse-500 focus:border-transparent text-sm"
                    placeholder="Create password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="link-confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="link-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={emailFormData.confirmPassword}
                    onChange={(e) => setEmailFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pulse-500 focus:border-transparent text-sm"
                    placeholder="Confirm password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-pulse-500 text-white text-sm font-medium rounded-md hover:bg-pulse-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Linking...' : 'Link Email/Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmailFormData({ email: '', password: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Account Linking Benefits</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Sign in with any linked method (Google, email/password)</li>
              <li>• All your data stays in one unified account</li>
              <li>• Enhanced security with multiple authentication options</li>
              <li>• Easy account recovery if you lose access to one method</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountLinking;