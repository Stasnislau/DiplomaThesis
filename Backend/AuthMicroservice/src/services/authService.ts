import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuid} from 'uuid';

export class AuthService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email: email },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id: id },
    });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  async createUser( email: string, password: string, name: string, surname: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await this.prisma.user.create({
      data: {
        id: uuid(),
        name,
        surname,
        email,
        password: hashedPassword,
        role: 'USER',
      },
    });
  }
}
