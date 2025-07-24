import React from "react";

interface LoadingIndicatorProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingIndicator({ 
  text = "加载中...", 
  size = "md" 
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };
  
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className={`${sizeClasses[size]} rounded-full border-t-primary border-r-primary border-b-primary/30 border-l-primary/30 animate-spin`}></div>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
} 

interface FullScreenLoadingProps {
  text?: string;
  subText?: string;
  isOpen: boolean;
}

export function FullScreenLoading({ 
  text = "处理中...", 
  subText,
  isOpen 
}: FullScreenLoadingProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background border shadow-lg rounded-lg p-8 max-w-sm w-full mx-auto text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-t-primary border-r-primary border-b-primary/30 border-l-primary/30 animate-spin"></div>
          <h3 className="text-xl font-medium mt-4">{text}</h3>
          {subText && <p className="text-sm text-muted-foreground">{subText}</p>}
        </div>
      </div>
    </div>
  );
} 