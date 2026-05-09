import React from "react";

export function Slider({ min = 0, max = 1, step = 1, value = [0], onValueChange, className = "", ...props }) {
  const handleChange = (event) => {
    const newValue = Number(event.target.value);
    if (onValueChange) {
      onValueChange([newValue]);
    }
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0] ?? value}
      onChange={handleChange}
      className={`w-full ${className}`}
      {...props}
    />
  );
}
