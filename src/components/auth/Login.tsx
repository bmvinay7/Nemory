import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface LoginProps {
  onSwitchToSignup: () => void;
  onClose: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToSignup, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();

  const getErrorMessage = (error: any) => {
    const errorCode = error.code;
    switch (errorCode) {
      case 'auth/user-not-found':
        return "No account found with this email address. Please sign up first.";
      case 'auth/wrong-password':
        return "Incorrect password. Please try again.";
      case 'auth/invalid-email':
        return "Please enter a valid email address.";
      case 'auth/user-disabled':
        return "This account has been disabled. Please contact support.";
      case 'auth/too-many-requests':
        return "Too many failed attempts. Please try again later.";
      case 'auth/network-request-failed':
        return "Network error. Please check your connection and try again.";
      case 'auth/invalid-credential':
        return "Invalid email or password. Please check your credentials.";
      default:
        return error.message || "Login failed. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    if (!email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      toast({
        title: "Welcome back! 🎉",
        description: "You've successfully logged in to Nemory."
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      toast({
        title: "Welcome to Nemory! 🎉",
        description: "You've successfully logged in with Google."
      });
      onClose();
    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = "Google login failed. Please try again.";
      
      if (errorCode === 'auth/popup-closed-by-user') {
        errorMessage = "Login cancelled. Please try again.";
      } else if (errorCode === 'auth/popup-blocked') {
        errorMessage = "Popup blocked. Please allow popups and try again.";
      } else if (errorCode === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your connection.";
      } else if (errorCode === 'auth/account-exists-with-different-credential') {
        const email = (error as any).email;
        const methods = (error as any).existingMethods || [];
        
        if (methods.includes('password')) {
          errorMessage = `An account with ${email} already exists with email/password. Please sign in with your email and password first, then you can link your Google account in settings.`;
        } else {
          errorMessage = `An account with ${email} already exists with a different sign-in method. Please use your original sign-in method.`;
        }
      }
      
      toast({
        title: "Google Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-pulse-500 to-pulse-600 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl text-gray-900">Nemory</h2>
            <p className="text-gray-500 text-sm">AI Notes Assistant</p>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome back</h3>
        <p className="text-gray-600">Sign in to continue to your dashboard</p>
      </div>

      {/* Google Login */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span className="font-medium text-gray-700">Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pulse-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pulse-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-pulse-500 to-pulse-600 text-white font-medium rounded-lg hover:from-pulse-600 hover:to-pulse-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <span>{loading ? 'Signing in...' : 'Sign in'}</span>
          {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-pulse-600 hover:text-pulse-700 font-medium transition-colors"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;