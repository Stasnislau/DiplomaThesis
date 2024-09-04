export interface BaseError {
  success: boolean;
  payload: {
    isOperational?: boolean;
    status: string;
    stack?: string;
    message: string;
  };
}
