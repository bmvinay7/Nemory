
import React, { useEffect, useState } from "react";
import { ArrowRight, Brain, Zap, Mail, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { currentUser } = useAuth();
  const { openModal } = useAuthModal();
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
      openModal('signup');
    }
  };
  
  return (
    <section 
      className="min-h-screen flex items-center justify-center relative overflow-hidden" 
      id="hero"
      style={{
        backgroundImage: `url('/Header-background.webp')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Text readability overlay - subtle brightening in center area only */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
      <div className="absolute inset-0 bg-radial-gradient-white from-transparent via-white/15 to-transparent opacity-70"></div>
      
      {/* Subtle decorative elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full opacity-20 blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-white/10 rounded-full opacity-30 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      
      <div className="container px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div 
            className="inline-flex items-center px-4 py-2 rounded-full bg-pulse-50 text-pulse-700 text-sm font-medium mb-8 opacity-0 animate-fade-in border border-pulse-200 shadow-sm relative z-10" 
            style={{ animationDelay: "0.1s" }}
          >
            <Brain className="w-4 h-4 mr-2" />
            <span>AI-Powered Intelligence</span>
            <Zap className="w-4 h-4 ml-2 text-pulse-500" />
          </div>
          
          {/* Main Heading */}
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold leading-tight mb-6 opacity-0 animate-fade-in drop-shadow-lg relative z-10" 
            style={{ animationDelay: "0.3s" }}
          >
            <span style={{ 
              color: "#F8F8FF",
              textShadow: "0 0 0.5px #FF6B35, 0 0 0.5px #FF6B35"
            }}>
              Nemory: Your Notes,
            </span><br />
            <span style={{ color: "#FFD700", opacity: 0.8 }} className="drop-shadow-lg">
              Perfected & Delivered
            </span>
          </h1>
          
          {/* Subtitle */}
          <p 
            className="text-xl sm:text-2xl text-gray-600 leading-relaxed mb-10 max-w-3xl mx-auto opacity-0 animate-fade-in" 
            style={{ animationDelay: "0.5s" }}
          >
            Transform your Notion notes into actionable insights with AI-powered analysis. 
            Get personalized summaries delivered instantly to your Telegram.
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
              className="inline-flex items-center px-8 py-4 bg-white/90 backdrop-blur-sm text-gray-700 font-semibold rounded-full border-2 border-white/30 hover:border-pulse-300 hover:text-pulse-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Learn How It Works
            </a>
          </div>
          
          {/* Feature highlights */}
          <div 
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto opacity-0 animate-fade-in" 
            style={{ animationDelay: "0.9s" }}
          >
            <div className="flex items-center justify-center space-x-3 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
              <Brain className="w-6 h-6 text-pulse-500" />
              <span className="font-medium text-gray-700">AI Analysis</span>
            </div>
            
            <div className="flex items-center justify-center space-x-3 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
              <MessageCircle className="w-6 h-6 text-blue-500" />
              <span className="font-medium text-gray-700">Telegram Delivery</span>
            </div>
            
            <div className="flex items-center justify-center space-x-3 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
              <Zap className="w-6 h-6 text-pulse-500" />
              <span className="font-medium text-gray-700">Instant Alerts</span>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
