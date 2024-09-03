export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  password: string;
  role: string;
}

type _User = User;

declare global {
  namespace Express {
    interface User extends _User {}
  }
}
