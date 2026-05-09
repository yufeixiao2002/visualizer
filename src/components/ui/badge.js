import React from "react";

export function Badge({ className = "", children, ...props }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${className}`} {...props}>
      {children}
    </span>
  );
}
