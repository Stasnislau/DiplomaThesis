export interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
  surname: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsersListResponse {
  users: AdminUser[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface UserResponse {
  user: AdminUser;
}

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
