import React from "react";
import Button from "@/components/common/Button";

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  surname: string;
}

interface UserDetailsProps {
  user: User;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ user }) => {
  // These functions will be implemented when API is integrated
  const handleRoleChange = () => {
    // Will be implemented with API
    console.log(`Change role for user ${user.id}`);
  };

  const handleResetPassword = () => {
    // Will be implemented with API
    console.log(`Reset password for user ${user.id}`);
  };

  const handleDeleteUser = () => {
    // Will be implemented with API
    console.log(`Delete user ${user.id}`);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">User Details</h2>
      
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">ID</p>
              <p className="text-sm font-medium text-gray-900">{user.id}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className={`text-sm font-medium ${
                user.role === "ADMIN" ? "text-purple-600" : "text-green-600"
              }`}>{user.role}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">First Name</p>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Last Name</p>
              <p className="text-sm font-medium text-gray-900">{user.surname}</p>
            </div>
            
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Actions</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant={user.role === "ADMIN" ? "secondary" : "primary"}
              onClick={handleRoleChange}
              className="w-full"
            >
              {user.role === "ADMIN" ? "Remove Admin Role" : "Make Admin"}
            </Button>
            
            <Button 
              variant="tertiary"
              onClick={handleResetPassword}
              className="w-full"
            >
              Reset Password
            </Button>
          </div>
          
          <Button 
            variant="danger"
            onClick={handleDeleteUser}
            className="w-full mt-4"
          >
            Delete User
          </Button>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Integration Note</h3>
          <p className="text-xs text-yellow-700">
            This component is prepared for API integration. User management actions 
            (role changes, password resets, deletion) will be implemented when 
            the backend endpoints are available.
          </p>
        </div>
      </div>
    </div>
  );
}; 