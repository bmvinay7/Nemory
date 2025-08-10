
import React, { useEffect, useState } from "react";
import { ArrowRight, Brain, Zap, Mail, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthModal from "./auth/AuthModal";

const Hero = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleGetStarted = () => {
    if (currentUser) {
      navigate('/dashboard');
    } else {
      setAuthMode('signup');
      setIsAuthModalOpen(true);
    }
  };
  
  return (
    <section 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-pulse-50/30" 
      id="hero"
    >
      {/* Background decorative elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-pulse-100 rounded-full opacity-30 blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-purple-100 rounded-full opacity-40 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-pulse-50 to-orange-50 rounded-full opacity-20 blur-3xl"></div>
      
      <div className="container px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div 
            className="inline-flex items-center px-4 py-2 rounded-full bg-pulse-100 text-pulse-700 text-sm font-medium mb-8 opacity-0 animate-fade-in border border-pulse-200" 
            style={{ animationDelay: "0.1s" }}
          >
            <Brain className="w-4 h-4 mr-2" />
            <span>AI-Powered Intelligence</span>
            <Zap className="w-4 h-4 ml-2 text-pulse-500" />
          </div>
          
          {/* Main Heading */}
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-gray-900 leading-tight mb-6 opacity-0 animate-fade-in" 
            style={{ animationDelay: "0.3s" }}
          >
            Nemory: Your Notes,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pulse-600 to-orange-500">
              Perfected & Delivered
            </span>
          </h1>
          
          {/* Subtitle */}
          <p 
            className="text-xl sm:text-2xl text-gray-600 leading-relaxed mb-10 max-w-3xl mx-auto opacity-0 animate-fade-in" 
            style={{ animationDelay: "0.5s" }}
          >
            Transform your Notion notes into actionable insights with AI-powered analysis. 
            Get personalized summaries delivered to your inbox and WhatsApp.
          </p>
          
          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 opacity-0 animate-fade-in" 
            style={{ animationDelay: "0.7s" }}
          >
            <button 
              onClick={handleGetStarted}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pulse-500 to-pulse-600 text-white font-semibold rounded-full hover:from-pulse-600 hover:to-pulse-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 group"
            >
              <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              {currentUser ? 'Go to Dashboard' : 'Get Started'}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <a 
              href="#how-it-works" 
              className="inline-flex items-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-full border-2 border-gray-200 hover:border-pulse-300 hover:text-pulse-600 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Learn How It Works
            </a>
          </div>
          
          {/* Feature highlights */}
          <div 
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto opacity-0 animate-fade-in" 
            style={{ animationDelay: "0.9s" }}
          >
            <div className="flex items-center justify-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm">
              <Brain className="w-6 h-6 text-pulse-500" />
              <span className="font-medium text-gray-700">AI Analysis</span>
            </div>
            
            <div className="flex items-center justify-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm">
              <Mail className="w-6 h-6 text-pulse-500" />
              <span className="font-medium text-gray-700">Email Delivery</span>
            </div>
            
            <div className="flex items-center justify-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm">
              <MessageCircle className="w-6 h-6 text-pulse-500" />
              <span className="font-medium text-gray-700">WhatsApp Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </section>
  );
};

export default Hero;
