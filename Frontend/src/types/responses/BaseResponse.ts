export interface BaseResponse <T> {
  success: boolean;
  payload: T;
  errors: string[];
}
