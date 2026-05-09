import React from "react";

export function Switch({ checked = false, onCheckedChange, className = "", ...props }) {
  const handleChange = (event) => {
    if (onCheckedChange) {
      onCheckedChange(event.target.checked);
    }
  };

  return (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="sr-only"
        {...props}
      />
      <span className="w-11 h-6 bg-gray-300 rounded-full relative transition-colors duration-200">
        <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </label>
  );
}
