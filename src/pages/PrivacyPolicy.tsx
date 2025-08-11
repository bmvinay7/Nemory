import React from 'react';
import { Brain, Shield, Lock, Eye, Database, Mail } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/new_logo.svg" 
                alt="Nemory Logo" 
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <h1 className="font-display font-bold text-xl text-gray-900">Nemory</h1>
                <p className="text-gray-500 text-xs">AI Notes Assistant</p>
              </div>
            </div>
            <a 
              href="/" 
              className="text-pulse-600 hover:text-pulse-700 font-medium transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-12 h-12 text-pulse-500" />
            </div>
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600 text-lg">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
            
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="w-6 h-6 text-pulse-500 mr-3" />
                Introduction
              </h2>
              <p className="text-gray-700 leading-relaxed">
                At Nemory ("we," "our," or "us"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered notes assistant service that integrates with Notion.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Database className="w-6 h-6 text-pulse-500 mr-3" />
                Information We Collect
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Account Information</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Name and email address when you create an account</li>
                    <li>Profile information from Google OAuth (if you sign up with Google)</li>
                    <li>Authentication tokens and session data</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notion Integration Data</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Notion workspace information (name, ID, icon)</li>
                    <li>Access tokens for your Notion workspace (encrypted and securely stored)</li>
                    <li>Content from your Notion pages that you choose to process</li>
                    <li>Metadata about your notes (creation date, last modified, etc.)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Usage Information</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>How you interact with our service</li>
                    <li>Features you use and preferences you set</li>
                    <li>Error logs and performance data</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="w-6 h-6 text-pulse-500 mr-3" />
                How We Use Your Information
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Provide and maintain our AI-powered notes analysis service</li>
                <li>Process and analyze your Notion content to generate summaries and insights</li>
                <li>Send you summaries and notifications via email and WhatsApp (with your consent)</li>
                <li>Improve our AI algorithms and service quality</li>
                <li>Provide customer support and respond to your inquiries</li>
                <li>Ensure the security and integrity of our service</li>
                <li>Comply with legal obligations and protect our rights</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Lock className="w-6 h-6 text-pulse-500 mr-3" />
                Data Security
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  We implement industry-standard security measures to protect your information:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>All data is encrypted in transit using TLS/SSL</li>
                  <li>Notion access tokens are encrypted at rest</li>
                  <li>We use Firebase Authentication for secure user management</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Limited access to your data on a need-to-know basis</li>
                  <li>Secure cloud infrastructure with Google Cloud Platform</li>
                </ul>
              </div>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="w-6 h-6 text-pulse-500 mr-3" />
                Data Sharing and Disclosure
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li><strong>Service Providers:</strong> With trusted third-party services (OpenAI for AI processing, email/SMS providers for notifications)</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice to you)</li>
                  <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
                </ul>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights and Choices</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct your account information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Disconnect:</strong> Revoke Notion integration access at any time</li>
                <li><strong>Opt-out:</strong> Unsubscribe from email notifications</li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide our services. When you delete your account, we will delete your personal information within 30 days, except where we are required to retain it for legal purposes.
              </p>
            </section>

            {/* International Transfers */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            {/* Contact Information */}
            <section className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="space-y-2 text-gray-700">
                <p><strong>Email:</strong> privacy@nemory.ai</p>
                <p><strong>Address:</strong> [Your Business Address]</p>
                <p><strong>Response Time:</strong> We will respond to your inquiry within 48 hours</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;