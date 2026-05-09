import React from "react";

export function Tabs({ children, className = "", ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function TabsList({ children, className = "", ...props }) {
  return (
    <div className={`flex space-x-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({ className = "", children, ...props }) {
  return (
    <button type="button" className={`px-3 py-1 rounded ${className}`} {...props}>
      {children}
    </button>
  );
}
