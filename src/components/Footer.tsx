import React from "react";
import { Brain, Mail, MessageCircle, Twitter, Linkedin, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-pulse-500/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <img 
                src="/new_logo.svg" 
                alt="Nemory Logo" 
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <h3 className="font-display font-bold text-2xl">Nemory</h3>
                <p className="text-gray-400 text-sm">AI Notes Assistant</p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
              Transform your Notion notes into actionable insights with AI-powered analysis. 
              Get personalized summaries delivered right to your inbox.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-pulse-500 rounded-lg flex items-center justify-center transition-colors duration-300 group">
                <Twitter className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-pulse-500 rounded-lg flex items-center justify-center transition-colors duration-300 group">
                <Linkedin className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-pulse-500 rounded-lg flex items-center justify-center transition-colors duration-300 group">
                <Github className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </a>
            </div>
          </div>
          
          {/* Features Section */}
          <div className="lg:col-span-1">
            <h4 className="font-semibold text-lg mb-6 text-white">Key Features</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Brain className="w-5 h-5 text-pulse-400" />
                <span className="text-gray-300">AI-Powered Analysis</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-pulse-400" />
                <span className="text-gray-300">Email Summaries</span>
              </div>
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5 text-pulse-400" />
                <span className="text-gray-300">WhatsApp Delivery</span>
              </div>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="lg:col-span-1">
            <h4 className="font-semibold text-lg mb-6 text-white">Ready to Get Started?</h4>
            <p className="text-gray-300 mb-6">
              Join thousands of knowledge workers who are already transforming their productivity with Nemory.
            </p>
            <a 
              href="#newsletter" 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pulse-500 to-pulse-600 text-white font-medium rounded-lg hover:from-pulse-600 hover:to-pulse-700 transition-all duration-300 shadow-lg hover:shadow-xl group"
            >
              Get Started
              <Brain className="w-4 h-4 ml-2 group-hover:animate-pulse" />
            </a>
          </div>
        </div>
        
        {/* Tagline Section */}
        <div className="text-center py-8 border-t border-gray-800">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-pulse-300 to-orange-300 italic mb-4">
            Built For Knowledge Workers
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Empowering professionals to turn information into action, one note at a time.
          </p>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-gray-400 text-sm">
              <p>© 2024 Nemory. All rights reserved.</p>
              <div className="hidden md:block w-1 h-1 bg-gray-600 rounded-full"></div>
              <p>Crafted with precision for productivity</p>
            </div>
            
            <div className="flex items-center space-x-6 text-gray-400 text-sm">
              <a href="/privacy" className="hover:text-pulse-400 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-pulse-400 transition-colors">Terms of Service</a>
              <a href="mailto:support@nemory.ai" className="hover:text-pulse-400 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;