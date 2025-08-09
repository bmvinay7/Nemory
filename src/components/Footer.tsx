import React from "react";

const Footer = () => {
  return (
    <footer className="w-full bg-white py-8">
      <div className="section-container">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-display font-bold text-lg text-gray-900">Nemory</span>
          </div>
          <p className="text-gray-600 text-sm">
            Transform your Notion notes into actionable insights with AI-powered analysis.
          </p>
          <p className="text-gray-500 text-xs">
            © 2024 Nemory. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;