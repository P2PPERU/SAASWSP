"use client";

import React from "react";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  id,
  className = "",
}) => {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center cursor-pointer ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onCheckedChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`w-11 h-6 flex items-center bg-gray-400 rounded-full p-1 transition-colors duration-200
          ${checked ? "bg-green-500" : "bg-gray-400"}
        `}
      >
        <span
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200
            ${checked ? "translate-x-5" : ""}
          `}
        />
      </span>
    </label>
  );
};
