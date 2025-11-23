import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { DropdownMenu } from "./DropdownMenu";
import { ChevronDownIcon, PersonIcon, ExitIcon } from "@radix-ui/react-icons";

interface UserMenuProps {
  className?: string;
  username?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  className = "",
  username = "User",
}) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center justify-between px-4 py-2 text-sm font-medium text-white bg-transparent rounded-md hover:bg-cyan-600 transition duration-150 ease-in-out focus:outline-none"
          >
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-white text-blue-500 flex items-center justify-center mr-2 font-bold">
                {username.charAt(0).toUpperCase()}
              </div>
              <span>{username}</span>
              <ChevronDownIcon className="ml-2 h-4 w-4 text-white" />
            </div>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="end" className="w-48">
          <DropdownMenu.Item
            onSelect={() => navigate("/profile")}
            className="cursor-pointer"
          >
            <PersonIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator />

          <DropdownMenu.Item
            onSelect={() => logout()}
            className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
          >
            <ExitIcon className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
