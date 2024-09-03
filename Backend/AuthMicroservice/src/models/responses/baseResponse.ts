export interface BaseResponse<T> {
  success: boolean;
  payload: T;
  message?: string;
}
