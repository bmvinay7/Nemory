import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * SafeText component that ensures no DOM nesting violations
 * Use this instead of <p> tags when content might contain block elements
 */
export interface SafeTextProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'p' | 'span' | 'div';
}

const SafeText = React.forwardRef<HTMLDivElement, SafeTextProps>(
  ({ className, as = 'div', children, ...props }, ref) => {
    const Component = as;
    
    // If children contains any React elements that might be block elements,
    // force to use div to prevent nesting violations
    const hasComplexChildren = React.Children.toArray(children).some(child => 
      React.isValidElement(child) && 
      typeof child.type === 'string' && 
      ['div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav'].includes(child.type)
    );
    
    const FinalComponent = hasComplexChildren ? 'div' : Component;
    
    return (
      <FinalComponent
        ref={ref}
        className={cn(
          // Apply paragraph-like styling when using div as fallback
          FinalComponent === 'div' && as === 'p' && "text-sm text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
      </FinalComponent>
    );
  }
);

SafeText.displayName = "SafeText";

export { SafeText };