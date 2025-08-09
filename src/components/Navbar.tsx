import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X, ArrowRight, Brain, Zap, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthModal from "./auth/AuthModal";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    document.body.style.overflow = !isMenuOpen ? 'hidden' : '';
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    if (isMenuOpen) {
      setIsMenuOpen(false);
      document.body.style.overflow = '';
    }
  };

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled 
          ? "bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-100 py-3" 
          : "bg-transparent py-4"
      )}
    >
      <div className="container flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a 
          href="#" 
          className="flex items-center space-x-3 group"
          onClick={(e) => {
            e.preventDefault();
            scrollToTop();
          }}
          aria-label="Nemory"
        >
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-pulse-500 to-pulse-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-pulse-500/25 transition-all duration-300">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-pulse-400 rounded-full animate-pulse"></div>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-xl text-gray-900 group-hover:text-pulse-600 transition-colors">
              Nemory
            </span>
            <span className="text-xs text-gray-500 font-medium -mt-1">
              AI Notes Assistant
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8">
          <a 
            href="#" 
            className="nav-link font-medium"
            onClick={(e) => {
              e.preventDefault();
              scrollToTop();
            }}
          >
            Home
          </a>
          <a href="#how-it-works" className="nav-link font-medium">
            How it Works
          </a>
          <a href="#features" className="nav-link font-medium">
            Features
          </a>
          <a href="#testimonials" className="nav-link font-medium">
            Testimonials
          </a>
          
          {/* Auth Buttons */}
          <div className="flex items-center space-x-4 ml-4">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-pulse-500 to-pulse-600 text-white font-medium rounded-full hover:from-pulse-600 hover:to-pulse-700 transition-all duration-300 shadow-md hover:shadow-lg group"
                >
                  <User className="w-4 h-4 mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleAuthClick('login')}
                  className="text-gray-600 hover:text-pulse-600 font-medium transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleAuthClick('signup')}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-pulse-500 to-pulse-600 text-white font-medium rounded-full hover:from-pulse-600 hover:to-pulse-700 transition-all duration-300 shadow-md hover:shadow-lg group"
                >
                  <Zap className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile Auth + Menu */}
        <div className="flex items-center space-x-3 lg:hidden">
          {currentUser ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-3 py-2 bg-pulse-500 text-white text-sm font-medium rounded-full hover:bg-pulse-600 transition-colors"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={() => handleAuthClick('signup')}
              className="inline-flex items-center px-3 py-2 bg-pulse-500 text-white text-sm font-medium rounded-full hover:bg-pulse-600 transition-colors"
            >
              Try Free
            </button>
          )}
          <button 
            className="text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none" 
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={cn(
        "fixed inset-0 z-40 bg-white/95 backdrop-blur-lg flex flex-col pt-20 px-6 lg:hidden transition-all duration-300 ease-in-out",
        isMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
      )}>
        {/* Mobile Menu Header */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">
            Navigate Nemory
          </h3>
          <p className="text-gray-600 text-sm">
            Discover how AI transforms your notes
          </p>
        </div>

        <nav className="flex flex-col space-y-2">
          <a 
            href="#" 
            className="flex items-center justify-between py-4 px-6 rounded-xl hover:bg-pulse-50 hover:text-pulse-600 transition-all group" 
            onClick={(e) => {
              e.preventDefault();
              scrollToTop();
              setIsMenuOpen(false);
              document.body.style.overflow = '';
            }}
          >
            <span className="text-lg font-medium">Home</span>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </a>
          <a 
            href="#how-it-works" 
            className="flex items-center justify-between py-4 px-6 rounded-xl hover:bg-pulse-50 hover:text-pulse-600 transition-all group" 
            onClick={() => {
              setIsMenuOpen(false);
              document.body.style.overflow = '';
            }}
          >
            <span className="text-lg font-medium">How it Works</span>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </a>
          <a 
            href="#features" 
            className="flex items-center justify-between py-4 px-6 rounded-xl hover:bg-pulse-50 hover:text-pulse-600 transition-all group" 
            onClick={() => {
              setIsMenuOpen(false);
              document.body.style.overflow = '';
            }}
          >
            <span className="text-lg font-medium">Features</span>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </a>
          <a 
            href="#testimonials" 
            className="flex items-center justify-between py-4 px-6 rounded-xl hover:bg-pulse-50 hover:text-pulse-600 transition-all group" 
            onClick={() => {
              setIsMenuOpen(false);
              document.body.style.overflow = '';
            }}
          >
            <span className="text-lg font-medium">Testimonials</span>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </a>
        </nav>

        {/* Mobile Auth */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          {currentUser ? (
            <div className="space-y-3">
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setIsMenuOpen(false);
                  document.body.style.overflow = '';
                }}
                className="flex items-center justify-center w-full py-4 bg-gradient-to-r from-pulse-500 to-pulse-600 text-white font-medium rounded-xl hover:from-pulse-600 hover:to-pulse-700 transition-all shadow-lg group"
              >
                <User className="w-5 h-5 mr-2" />
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                  document.body.style.overflow = '';
                }}
                className="flex items-center justify-center w-full py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  handleAuthClick('signup');
                  setIsMenuOpen(false);
                  document.body.style.overflow = '';
                }}
                className="flex items-center justify-center w-full py-4 bg-gradient-to-r from-pulse-500 to-pulse-600 text-white font-medium rounded-xl hover:from-pulse-600 hover:to-pulse-700 transition-all shadow-lg group"
              >
                <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  handleAuthClick('login');
                  setIsMenuOpen(false);
                  document.body.style.overflow = '';
                }}
                className="flex items-center justify-center w-full py-3 text-gray-600 hover:text-pulse-600 font-medium rounded-xl transition-all"
              >
                Already have an account? Sign In
              </button>
            </div>
          )}
          <p className="text-center text-sm text-gray-500 mt-3">
            {currentUser ? `Welcome back, ${currentUser.displayName || 'User'}!` : 'Transform your notes in minutes'}
          </p>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </header>
  );
};

export default Navbar;