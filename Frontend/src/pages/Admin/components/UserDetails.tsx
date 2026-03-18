import React, { useState } from "react";

import Button from "@/components/common/Button";
import { useDeleteUser } from "@/api/hooks/useDeleteUser";
import { useUpdateUserRole } from "@/api/hooks/useUpdateUserRole";

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  surname: string;
}

interface UserDetailsProps {
  user: User;
  onUserDeleted?: () => void;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ user, onUserDeleted }) => {
  const { updateRole, isLoading: isRoleLoading } = useUpdateUserRole();
  const { deleteUser, isLoading: isDeleteLoading } = useDeleteUser();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRoleChange = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
      await updateRole({ id: user.id, role: newRole });
      setSuccessMsg(`Role changed to ${newRole}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await deleteUser(user.id);
      onUserDeleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
      setConfirmDelete(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">User Details</h2>

      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ID</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.id}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.role === "ADMIN"
                    ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                    : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                }`}
              >
                {user.role}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">First Name</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last Name</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.surname}</p>
            </div>

            <div className="col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.email}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-700 dark:text-green-400">{successMsg}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Actions</h3>

          <Button
            variant={user.role === "ADMIN" ? "secondary" : "primary"}
            onClick={handleRoleChange}
            isLoading={isRoleLoading}
            className="w-full"
          >
            {user.role === "ADMIN" ? "Remove Admin Role" : "Make Admin"}
          </Button>

          {confirmDelete ? (
            <div className="flex gap-2">
              <Button
                variant="danger"
                onClick={handleDeleteUser}
                isLoading={isDeleteLoading}
                className="flex-1"
              >
                Confirm Delete
              </Button>
              <Button
                variant="tertiary"
                onClick={() => setConfirmDelete(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              onClick={handleDeleteUser}
              className="w-full"
            >
              Delete User
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};