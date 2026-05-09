import React from "react";

export function Button({ className = "", children, ...props }) {
  return (
    <button className={`inline-flex items-center justify-center px-4 py-2 rounded bg-blue-600 text-white ${className}`} {...props}>
      {children}
    </button>
  );
}
