import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './authService';
import { PrismaService } from '../../prisma/prismaService';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { createMockPrismaService, MockPrismaService } from './__mocks__/prisma.mock';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: MockPrismaService;
  let jwtService: jest.Mocked<JwtService>;
  let eventService: jest.Mocked<ClientProxy>;

  const mockUser = {
    id: 'test-user-id-123',
    email: 'test@example.com',
    role: Role.USER,
    createdAt: new Date(),
  };

  const mockCredentials = {
    id: 'cred-id-123',
    password: 'hashedPassword123',
    userId: mockUser.id,
  };

  const mockRefreshToken = {
    id: 'refresh-token-id',
    token: 'mock.refresh.token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userId: mockUser.id,
  };

  beforeEach(async () => {
    const mockPrismaService = createMockPrismaService();

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockEventService = {
      emit: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: 'EVENT_SERVICE',
          useValue: mockEventService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService) as any;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    eventService = module.get('EVENT_SERVICE') as jest.Mocked<ClientProxy>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect to event service', async () => {
      await service.onModuleInit();
      expect(eventService.connect).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.credentials.findUnique.mockResolvedValue(mockCredentials as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(prismaService.credentials.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockCredentials.password);
    });

    it('should return null when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });

    it('should return null when password is incorrect', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.credentials.findUnique.mockResolvedValue(mockCredentials as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', mockCredentials.password);
    });

    it('should return null when credentials do not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.credentials.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens when credentials are valid', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.credentials.findUnique.mockResolvedValue(mockCredentials as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign
        .mockReturnValueOnce('mock.access.token')
        .mockReturnValueOnce('mock.refresh.token');
      prismaService.refreshToken.create.mockResolvedValue(mockRefreshToken as any);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'John',
        surname: 'Doe',
      };
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      const result = await service.register(userDto);

      expect(result).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: userDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(userDto.password, 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: userDto.email,
          role: 'USER',
          credentials: {
            create: {
              password: 'hashedPassword123',
            },
          },
        },
      });
      expect(eventService.emit).toHaveBeenCalledWith('user.created', expect.any(Object));
    });

    it('should throw BadRequestException when email already exists', async () => {
      const userDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'John',
        surname: 'Doe',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(service.register(userDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(userDto)).rejects.toThrow(
        'User with this email already exists',
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      jwtService.sign.mockReturnValue('mock.access.token');

      const result = service.generateAccessToken(mockUser as any);

      expect(result).toBe('mock.access.token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: mockUser.email,
          sub: mockUser.id,
          role: mockUser.role,
        },
        expect.objectContaining({
          secret: expect.any(String),
          expiresIn: expect.any(String),
        }),
      );
    });
  });

  describe('createRefreshToken', () => {
    it('should create and save a refresh token', async () => {
      jwtService.sign.mockReturnValue('mock.refresh.token');
      prismaService.refreshToken.create.mockResolvedValue(mockRefreshToken as any);

      const result = await service.createRefreshToken(mockUser as any);

      expect(result).toBe('mock.refresh.token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: mockUser.email,
          sub: mockUser.id,
        },
        expect.objectContaining({
          secret: expect.any(String),
          expiresIn: expect.any(String),
        }),
      );
      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: 'mock.refresh.token',
          userId: mockUser.id,
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('refreshToken', () => {
    it('should return new access token with valid refresh token', async () => {
      const validRefreshToken = 'valid.refresh.token';
      prismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken as any);
      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
      });
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('new.access.token');

      const result = await service.refreshToken(validRefreshToken);

      expect(result).toEqual({
        accessToken: 'new.access.token',
        refreshToken: undefined,
      });
      expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: validRefreshToken },
      });
      expect(jwtService.verify).toHaveBeenCalled();
    });

    it('should throw BadRequestException when refresh token is missing', async () => {
      await expect(service.refreshToken('')).rejects.toThrow(BadRequestException);
      await expect(service.refreshToken('')).rejects.toThrow('Refresh token is required');
    });

    it('should throw BadRequestException when refresh token is invalid', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid.token')).rejects.toThrow(BadRequestException);
      await expect(service.refreshToken('invalid.token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken as any);
      jwtService.verify.mockReturnValue({
        sub: 'nonexistent-user-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('valid.token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('removeRefreshToken', () => {
    it('should delete refresh token from database', async () => {
      const token = 'token.to.delete';
      prismaService.refreshToken.delete.mockResolvedValue(mockRefreshToken as any);

      await service.removeRefreshToken(token);

      expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { token },
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password and emit event', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      prismaService.credentials.update.mockResolvedValue(mockCredentials as any);

      const newPassword = await service.resetPassword(mockUser.email);

      expect(newPassword).toBeDefined();
      expect(typeof newPassword).toBe('string');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(prismaService.credentials.update).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        data: { password: 'newHashedPassword' },
      });
      expect(eventService.emit).toHaveBeenCalledWith('password.reset', expect.any(Object));
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword('nonexistent@example.com')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updatePassword', () => {
    it('should successfully update password', async () => {
      const userId = mockUser.id;
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';

      const adminUser = { ...mockUser, role: Role.ADMIN };
      prismaService.user.findUnique.mockResolvedValue(adminUser as any);
      prismaService.credentials.findUnique.mockResolvedValue(mockCredentials as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      prismaService.credentials.update.mockResolvedValue(mockCredentials as any);

      await service.updatePassword(userId, oldPassword, newPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, mockCredentials.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(prismaService.credentials.update).toHaveBeenCalledWith({
        where: { userId },
        data: { password: 'newHashedPassword' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updatePassword('fake-id', 'old', 'new')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updatePassword('fake-id', 'old', 'new')).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw BadRequestException when old password is incorrect', async () => {
      const adminUser = { ...mockUser, role: Role.ADMIN };
      prismaService.user.findUnique.mockResolvedValue(adminUser as any);
      prismaService.credentials.findUnique.mockResolvedValue(mockCredentials as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.updatePassword(mockUser.id, 'wrongOld', 'new')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updatePassword(mockUser.id, 'wrongOld', 'new')).rejects.toThrow(
        'Invalid old password',
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role and emit event', async () => {
      const userData = { id: mockUser.id, role: Role.ADMIN };
      const updatedUser = { ...mockUser, role: Role.ADMIN };
      prismaService.user.update.mockResolvedValue(updatedUser as any);

      await service.updateUserRole(userData);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userData.id },
        data: { role: userData.role },
      });
      expect(eventService.emit).toHaveBeenCalledWith('user.updatedRole', {
        id: userData.id,
        role: userData.role,
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user and emit event', async () => {
      const userData = { id: mockUser.id };
      prismaService.user.delete.mockResolvedValue(mockUser as any);

      await service.deleteUser(userData);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userData.id },
      });
      expect(eventService.emit).toHaveBeenCalledWith('user.deleted', {
        id: userData.id,
      });
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-2', email: 'user2@example.com' }];
      prismaService.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await service.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(prismaService.user.findMany).toHaveBeenCalled();
    });
  });
});
