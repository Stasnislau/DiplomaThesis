import React, { useState } from "react";
import TextField from "@/components/common/TextField";
import { User } from "@/types/models/User";

interface UsersListProps {
  users: User[];
  selectedUserId: string | null;
  onUserSelect: (userId: string) => void;
}

export const UsersList: React.FC<UsersListProps> = ({ 
  users, 
  selectedUserId, 
  onUserSelect 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.surname.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Users</h2>
        
        <TextField
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              roleFilter === "ALL" 
                ? "bg-indigo-100 text-indigo-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setRoleFilter("ALL")}
          >
            All
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              roleFilter === "USER" 
                ? "bg-indigo-100 text-indigo-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setRoleFilter("USER")}
          >
            Users
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              roleFilter === "ADMIN" 
                ? "bg-indigo-100 text-indigo-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setRoleFilter("ADMIN")}
          >
            Admins
          </button>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-grow">
        {filteredUsers.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map(user => (
              <li 
                key={user.id}
                className={`px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedUserId === user.id ? 'bg-indigo-50' : ''
                }`}
                onClick={() => onUserSelect(user.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name} {user.surname}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === "ADMIN" 
                      ? "bg-purple-100 text-purple-800" 
                      : "bg-green-100 text-green-800"
                  }`}>
                    {user.role}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No users found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}; 