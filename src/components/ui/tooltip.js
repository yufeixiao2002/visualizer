import React from "react";

export function TooltipProvider({ children }) {
  return <>{children}</>;
}

export function Tooltip({ children }) {
  return <div>{children}</div>;
}

export function TooltipTrigger({ children }) {
  return <>{children}</>;
}

export function TooltipContent({ className = "", children, ...props }) {
  return (
    <div className={`p-2 rounded shadow bg-black text-white ${className}`} {...props}>
      {children}
    </div>
  );
}
