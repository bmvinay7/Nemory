import React from "react";

const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-r from-purple-900 via-purple-700 to-orange-500 py-8">
      <div className="section-container">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-display font-bold text-lg text-white">Nemory</span>
          </div>
          <p className="text-white/90 text-sm">
            Transform your Notion notes into actionable insights with AI-powered analysis.
          </p>
          <p className="text-white/70 text-xs">
            © 2024 Nemory. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;