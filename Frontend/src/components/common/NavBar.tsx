import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface NavOption {
  label: string;
  value: string;
  path: string;
}

interface NavBarProps {
  options: NavOption[];
  defaultLabel?: string;
  className?: string;
}

export const NavBar: React.FC<NavBarProps> = ({ 
  options, 
  defaultLabel = "Navigate", 
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<NavOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOptionClick = (option: NavOption) => {
    setSelectedOption(option);
    setIsOpen(false);
    navigate(option.path);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-white bg-transparent rounded-md hover:bg-cyan-600 transition duration-150 ease-in-out focus:outline-none"
      >
        {selectedOption ? selectedOption.label : defaultLabel}
        <span className="ml-2 h-4 w-4 text-white">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
