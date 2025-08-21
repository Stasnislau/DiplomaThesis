import React, { useState } from "react";
import { UsersList } from "./components/UsersList";
import { UserDetails } from "./components/UserDetails";
import { AdminSidebar } from "./components/AdminSidebar";
import { useUsers } from "@/api/hooks/useUsers";

export const AdminDashboardPage: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { users } = useUsers();

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  const selectedUser = users?.find((user) => user.id === selectedUserId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <AdminSidebar />
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="border-r border-gray-200">
                  <UsersList
                    users={users ?? []}
                    selectedUserId={selectedUserId}
                    onUserSelect={handleUserSelect}
                  />
                </div>
                <div>
                  {selectedUser ? (
                    <UserDetails user={selectedUser} />
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      Select a user to view details
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
