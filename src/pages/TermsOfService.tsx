import React from 'react';
import { Brain, FileText, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pulse-500 to-pulse-600 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
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
              <FileText className="w-12 h-12 text-pulse-500" />
            </div>
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600 text-lg">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
            
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-6 h-6 text-pulse-500 mr-3" />
                Agreement to Terms
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Welcome to Nemory! These Terms of Service ("Terms") govern your use of our AI-powered notes assistant service that integrates with Notion. By accessing or using Nemory, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our service.
              </p>
            </section>

            {/* Service Description */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="w-6 h-6 text-pulse-500 mr-3" />
                Service Description
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Nemory is an AI-powered service that:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Connects to your Notion workspace with your permission</li>
                  <li>Analyzes your notes and documents using artificial intelligence</li>
                  <li>Generates summaries and actionable insights from your content</li>
                  <li>Delivers these insights via email and WhatsApp notifications</li>
                  <li>Helps you organize and act on your knowledge more effectively</li>
                </ul>
              </div>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Accounts and Registration</h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  To use Nemory, you must create an account and provide accurate information:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>You must be at least 13 years old to use our service</li>
                  <li>You are responsible for maintaining the security of your account</li>
                  <li>You must provide accurate and complete information</li>
                  <li>You are responsible for all activities under your account</li>
                  <li>You must notify us immediately of any unauthorized use</li>
                </ul>
              </div>
            </section>

            {/* Notion Integration */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Notion Integration</h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  When you connect your Notion workspace to Nemory:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>You grant us read-only access to your Notion content</li>
                  <li>We will only access content you explicitly choose to process</li>
                  <li>You can revoke this access at any time through your dashboard</li>
                  <li>You remain the owner of all your Notion content</li>
                  <li>We do not modify or delete your Notion content</li>
                </ul>
              </div>
            </section>

            {/* Acceptable Use */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-6 h-6 text-pulse-500 mr-3" />
                Acceptable Use Policy
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  You agree not to use Nemory for any unlawful or prohibited activities:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-red-600 mb-2 flex items-center">
                      <XCircle className="w-5 h-5 mr-2" />
                      Prohibited Uses
                    </h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm ml-4">
                      <li>Illegal or harmful activities</li>
                      <li>Harassment or abuse of others</li>
                      <li>Spam or unsolicited communications</li>
                      <li>Violating intellectual property rights</li>
                      <li>Attempting to hack or compromise our service</li>
                      <li>Processing confidential or sensitive data without authorization</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-green-600 mb-2 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Encouraged Uses
                    </h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm ml-4">
                      <li>Personal note organization</li>
                      <li>Professional knowledge management</li>
                      <li>Educational content analysis</li>
                      <li>Creative project planning</li>
                      <li>Research and documentation</li>
                      <li>Team collaboration insights</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* AI Processing */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">AI Processing and Content</h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Our AI processing service:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Uses advanced language models to analyze your content</li>
                  <li>Generates summaries and insights based on your notes</li>
                  <li>May process your content through third-party AI services (OpenAI)</li>
                  <li>Does not store your content permanently on AI service providers</li>
                  <li>Continuously improves through machine learning (without storing personal data)</li>
                </ul>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Important Note</h4>
                      <p className="text-yellow-700 text-sm mt-1">
                        While our AI is highly accurate, summaries and insights are generated automatically and may not always be perfect. Please review AI-generated content before making important decisions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Payment and Billing */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Payment and Billing</h2>
              <div className="space-y-4">
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>We offer both free and paid subscription plans</li>
                  <li>Paid subscriptions are billed monthly or annually</li>
                  <li>All fees are non-refundable except as required by law</li>
                  <li>We may change our pricing with 30 days' notice</li>
                  <li>You can cancel your subscription at any time</li>
                  <li>Upon cancellation, you retain access until the end of your billing period</li>
                </ul>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Intellectual Property</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Your Content</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>You retain all rights to your original content</li>
                    <li>You grant us a limited license to process your content for our service</li>
                    <li>We do not claim ownership of your notes or documents</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Our Service</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Nemory's software, algorithms, and branding are our property</li>
                    <li>You may not copy, modify, or reverse engineer our service</li>
                    <li>AI-generated summaries are provided as-is for your use</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Privacy and Data */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy and Data Protection</h2>
              <p className="text-gray-700 leading-relaxed">
                Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using Nemory, you also agree to our Privacy Policy.
              </p>
            </section>

            {/* Service Availability */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Service Availability</h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  We strive to provide reliable service, but:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>We do not guarantee 100% uptime or availability</li>
                  <li>We may perform maintenance that temporarily interrupts service</li>
                  <li>We may modify or discontinue features with reasonable notice</li>
                  <li>Third-party integrations (Notion, email providers) may affect our service</li>
                </ul>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEMORY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
                </p>
              </div>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Termination</h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Either party may terminate this agreement:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>You may delete your account at any time</li>
                  <li>We may suspend or terminate accounts that violate these Terms</li>
                  <li>We may discontinue the service with 30 days' notice</li>
                  <li>Upon termination, we will delete your data within 30 days</li>
                </ul>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We may modify these Terms from time to time. We will notify you of any material changes by email or through our service. Your continued use of Nemory after such changes constitutes acceptance of the new Terms.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms are governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law principles. Any disputes arising from these Terms will be resolved in the courts of [Your Jurisdiction].
              </p>
            </section>

            {/* Contact Information */}
            <section className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-gray-700">
                <p><strong>Email:</strong> legal@nemory.ai</p>
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

export default TermsOfService;