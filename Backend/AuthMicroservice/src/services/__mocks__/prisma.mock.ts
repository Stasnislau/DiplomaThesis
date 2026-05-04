/**
 * Mock factory for PrismaService
 * Provides properly typed mocks for all Prisma models
 */

export const createMockPrismaService = () => {
  const mock = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    credentials: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    // Pretend the transaction passes through to the same mock — every
    // call inside refreshToken rotation lands on the same jest.fn(),
    // so assertions still see them.
    $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb(mock),
    ),
  };
  return mock;
};

export type MockPrismaService = ReturnType<typeof createMockPrismaService>;
