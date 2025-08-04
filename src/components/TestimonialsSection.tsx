import React from "react";

const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: "Nemory transformed how I use my research notes. Instead of thousands of scattered ideas, I now get weekly digests that actually help me write my papers.",
      author: "Dr. Sarah Chen",
      role: "Research Scientist",
      company: "MIT",
      avatar: "SC"
    },
    {
      quote: "I was drowning in meeting notes and project ideas. Nemory's WhatsApp summaries keep me on track with what actually matters for my startup.",
      author: "Marcus Rodriguez",
      role: "Founder",
      company: "TechFlow",
      avatar: "MR"
    },
    {
      quote: "The AI doesn't just summarize - it understands context. My book notes are now organized insights that I actually reference and implement.",
      author: "Emma Thompson",
      role: "Product Manager",
      company: "Spotify",
      avatar: "ET"
    },
    {
      quote: "Finally, a tool that helps me DO something with my notes instead of just collecting them. The action-oriented summaries are game-changing.",
      author: "David Kim",
      role: "Strategy Consultant",
      company: "McKinsey",
      avatar: "DK"
    },
    {
      quote: "Nemory's Gmail integration fits perfectly into my workflow. I get personalized learning insights from my course notes every Sunday.",
      author: "Priya Patel",
      role: "Graduate Student",
      company: "Stanford",
      avatar: "PP"
    },
    {
      quote: "The scheduling feature is brilliant. I get project reminders exactly when I need them, not when I'm overwhelmed with other tasks.",
      author: "James Wilson",
      role: "Engineering Manager",
      company: "Google",
      avatar: "JW"
    }
  ];

  return (
    <section className="w-full py-12 sm:py-16 md:py-20 bg-gray-50" id="testimonials">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="text-center mb-12 sm:mb-16 animate-on-scroll">
          <div className="pulse-chip mx-auto mb-4">
            <span>Testimonials</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight text-gray-900 mb-4">
            Loved by Knowledge <br className="hidden sm:block" />Workers Worldwide
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            See how professionals are transforming their note-taking into actionable intelligence with Nemory.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="glass-card p-6 animate-on-scroll hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-4">
                <div className="flex text-pulse-500 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed">
                  "{testimonial.quote}"
                </p>
              </div>
              
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-pulse-500 text-white flex items-center justify-center font-medium text-sm mr-3">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 sm:mt-16 animate-on-scroll">
          <div className="inline-flex items-center space-x-4 text-gray-600">
            <span className="text-sm">Join 10,000+ knowledge workers</span>
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-current text-pulse-500" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm">4.9/5 rating</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;