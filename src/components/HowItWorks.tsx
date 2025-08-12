
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Database, Brain, FileText, Send } from "lucide-react";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

const StepCard = ({ number, title, description, isActive, onClick, icon }: StepCardProps) => {
  return (
    <div 
      className={cn(
        "rounded-xl p-6 cursor-pointer transition-all duration-500 border group",
        isActive 
          ? "bg-white shadow-elegant border-pulse-200 scale-105" 
          : "bg-white/70 hover:bg-white/90 border-transparent hover:shadow-md"
      )}
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className={cn(
          "flex items-center justify-center rounded-full w-12 h-12 mr-4 flex-shrink-0 transition-all duration-300",
          isActive ? "bg-pulse-500 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-pulse-100 group-hover:text-pulse-600"
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className={cn(
              "text-xs font-bold px-2 py-1 rounded-full mr-3 transition-colors duration-300",
              isActive ? "bg-pulse-100 text-pulse-600" : "bg-gray-100 text-gray-500"
            )}>
              {number}
            </span>
            <h3 className={cn(
              "text-lg font-semibold transition-colors duration-300",
              isActive ? "text-pulse-600" : "text-gray-800"
            )}>
              {title}
            </h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepsData = [
    {
      number: "01",
      title: "Connect Your Notion",
      description: "Securely link your Notion workspace to Nemory. We'll analyze your notes, databases, and pages automatically.",
      image: "/notion-connect.png",
      icon: <Database className="w-6 h-6" />
    },
    {
      number: "02",
      title: "AI Analysis & Processing",
      description: "Our advanced AI reads through your notes, identifies key insights, and extracts actionable items from your content.",
      image: "/ai-analysis.png",
      icon: <Brain className="w-6 h-6" />
    },
    {
      number: "03",
      title: "Smart Summarization",
      description: "Nemory creates personalized summaries highlighting important tasks, ideas, and follow-ups from your notes.",
      image: "/smart-summarization.png",
      icon: <FileText className="w-6 h-6" />
    },
    {
      number: "04",
      title: "Telegram Delivery",
      description: "Receive your insights instantly via Telegram on your schedule, so you never miss important information.",
      image: "/delivery-action.png",
      icon: <Send className="w-6 h-6" />
    }
  ];

  useEffect(() => {
    // Auto-cycle through steps
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % stepsData.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [stepsData.length]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    const elements = document.querySelectorAll(".fade-in-stagger");
    elements.forEach((el, index) => {
      (el as HTMLElement).style.animationDelay = `${0.1 * (index + 1)}s`;
      observer.observe(el);
    });
    
    return () => {
      elements.forEach((el) => {
        observer.unobserve(el);
      });
    };
  }, []);
  
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white relative" id="how-it-works" ref={sectionRef}>
      {/* Background decorative elements */}
      <div className="absolute -top-20 right-0 w-72 h-72 bg-pulse-100 rounded-full opacity-40 blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-10 w-64 h-64 bg-pulse-50 rounded-full opacity-50 blur-3xl -z-10"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-pulse-100 to-orange-100 rounded-full opacity-20 blur-3xl -z-10"></div>
      
      <div className="section-container">
        <div className="text-center mb-16 opacity-0 fade-in-stagger">
          <div className="pulse-chip mx-auto mb-4">
            <span>Process</span>
          </div>
          <h2 className="section-title mb-4">From Notes to Action in 4 Steps</h2>
          <p className="section-subtitle mx-auto">
            Transform your scattered Notion notes into organized, actionable insights delivered instantly to your Telegram.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4 order-2 lg:order-1 opacity-0 fade-in-stagger">
            {stepsData.map((step, index) => (
              <StepCard
                key={step.number}
                number={step.number}
                title={step.title}
                description={step.description}
                isActive={activeStep === index}
                onClick={() => setActiveStep(index)}
                icon={step.icon}
              />
            ))}
          </div>
          
          <div className="relative rounded-3xl overflow-hidden h-[500px] shadow-elegant order-1 lg:order-2 opacity-0 fade-in-stagger">
            {stepsData.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "absolute inset-0 transition-all duration-1000",
                  activeStep === index ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
                )}
              >
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pulse-900/80 via-pulse-900/20 to-transparent">
                  <div className="absolute top-6 right-6">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <div className="text-white">
                        {step.icon}
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-center mb-3">
                      <span className="bg-pulse-500 text-white text-xs font-bold px-3 py-1 rounded-full mr-3">
                        {step.number}
                      </span>
                      <div className="h-px bg-white/30 flex-1"></div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">{step.title}</h3>
                    <p className="text-white/90 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Progress indicators */}
            <div className="absolute bottom-6 left-6 flex space-x-2">
              {stepsData.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    activeStep === index ? "bg-white w-8" : "bg-white/50 hover:bg-white/70"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
