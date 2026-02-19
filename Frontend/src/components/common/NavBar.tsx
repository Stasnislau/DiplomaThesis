import { ChevronDownIcon } from "@radix-ui/react-icons";
import { DropdownMenu } from "./DropdownMenu";
import React from "react";
import cn from "classnames";
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
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium transition duration-150 ease-in-out focus:outline-none rounded-md",
            "bg-transparent hover:bg-white/10", // Default style assumption, can be overridden by className
            className
          )}
        >
          {defaultLabel}
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end" className="w-48 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {options.map((option) => (
          <DropdownMenu.Item
            key={option.value}
            onSelect={() => navigate(option.path)}
            className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
          >
            {option.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
