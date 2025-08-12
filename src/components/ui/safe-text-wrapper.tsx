import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * SafeTextWrapper - A component that ensures no DOM nesting violations
 * Automatically converts any p tags to divs when they contain block elements
 */
export interface SafeTextWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'p' | 'span' | 'div';
  children: React.ReactNode;
}

const SafeTextWrapper = React.forwardRef<HTMLDivElement, SafeTextWrapperProps>(
  ({ className, as = 'div', children, ...props }, ref) => {
    // Always use div to prevent any nesting issues
    return (
      <div
        ref={ref}
        className={cn(
          // Apply paragraph-like styling when requested
          as === 'p' && "text-sm text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SafeTextWrapper.displayName = "SafeTextWrapper";

export { SafeTextWrapper };