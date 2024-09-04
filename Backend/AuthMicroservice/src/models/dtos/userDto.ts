import { User } from '../userModel';

export interface UserDto extends Omit<User, 'password'> {}
