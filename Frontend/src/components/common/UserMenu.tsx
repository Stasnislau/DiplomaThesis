import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { DropdownMenu } from "./DropdownMenu";
import { ChevronDownIcon, PersonIcon, ExitIcon } from "@radix-ui/react-icons";

interface UserMenuProps {
  className?: string;
  username?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  className = "",
  username,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { logout } = useAuthStore();
  const user = useUserStore((s) => s.user);

  const displayName = username
    ?? (user?.name?.trim() ? `${user.name}${user.surname ? ` ${user.surname[0]}.` : ""}` : null)
    ?? user?.email?.split("@")[0]
    ?? t("nav.profile");

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center justify-between px-4 py-2 text-sm font-medium text-white bg-transparent rounded-md hover:bg-cyan-600 transition duration-150 ease-in-out focus:outline-none"
          >
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 flex items-center justify-center mr-2 font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span>{displayName}</span>
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
            <span>{t("nav.profile")}</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator />

          <DropdownMenu.Item
            onSelect={() => logout()}
            className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-900/30 cursor-pointer"
          >
            <ExitIcon className="mr-2 h-4 w-4" />
            <span>{t("nav.logout")}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
