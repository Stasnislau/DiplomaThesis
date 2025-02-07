export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface BaseResponse<T> {
  success: boolean;
  payload: T;
}

export interface AuthenticatedRequestHeaders {
  authorization: string;
}

