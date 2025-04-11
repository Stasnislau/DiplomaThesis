// User-related types
export interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
  surname: string;
  createdAt?: string;
  updatedAt?: string;
}

// API response types (for future implementation)
export interface UsersListResponse {
  users: AdminUser[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface UserResponse {
  user: AdminUser;
}

// Action types (for future implementation)
export interface ChangeRoleRequest {
  userId: string;
  newRole: string;
}

export interface ResetPasswordRequest {
  userId: string;
}

export interface DeleteUserRequest {
  userId: string;
} 