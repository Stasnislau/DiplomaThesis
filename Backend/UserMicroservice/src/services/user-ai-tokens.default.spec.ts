import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../prisma/prismaService";
import { UserAITokensService } from "./user-ai-tokens.service";
import { encryptSecret } from "../utils/secretCipher";

/**
 * Covers the paths around the default provider key that the main spec
 * leaves open: promoting one key to default, deleting a key, and the
 * masking that keeps a full credential out of any response. A learner
 * may hold several keys, and exactly one of them drives generation, so
 * a promotion that fails to demote the previous default would send
 * calls to the wrong paid account.
 */
describe("UserAITokensService (default key and masking)", () => {
  let service: UserAITokensService;
  let prisma: any;
  let tx: any;

  const PLAINTEXT = "sk-live-abcdefghijklmnop";

  const storedRow = (over: Record<string, unknown> = {}) => ({
    id: "token-1",
    userId: "learner-1",
    token: encryptSecret(PLAINTEXT),
    aiProviderId: "openai",
    isDefault: false,
    createdAt: new Date(),
    ...over,
  });

  beforeEach(async () => {
    tx = {
      userAIToken: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };

    prisma = {
      userAIToken: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAITokensService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UserAITokensService);
  });

  describe("promoting a key to default", () => {
    it("demotes the previous default before promoting the new one", async () => {
      tx.userAIToken.findFirst.mockResolvedValue(storedRow());
      tx.userAIToken.update.mockResolvedValue(storedRow({ isDefault: true }));

      await service.setDefault("token-1", "learner-1");

      expect(tx.userAIToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "learner-1", isDefault: true },
        data: { isDefault: false },
      });
      expect(tx.userAIToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDefault: true } }),
      );
    });

    it("returns nothing and changes nothing for a key of another learner", async () => {
      tx.userAIToken.findFirst.mockResolvedValue(null);

      const result = await service.setDefault("token-1", "someone-else");

      expect(result).toBeNull();
      expect(tx.userAIToken.updateMany).not.toHaveBeenCalled();
      expect(tx.userAIToken.update).not.toHaveBeenCalled();
    });

    it("never returns the full credential after a promotion", async () => {
      tx.userAIToken.findFirst.mockResolvedValue(storedRow());
      tx.userAIToken.update.mockResolvedValue(storedRow({ isDefault: true }));

      const result: any = await service.setDefault("token-1", "learner-1");

      expect(result.token).not.toBe(PLAINTEXT);
      expect(result.token).toContain("...");
      expect(result.token.startsWith("sk-l")).toBe(true);
    });
  });

  describe("removing a key", () => {
    it("returns the removed row masked", async () => {
      prisma.userAIToken.findFirst.mockResolvedValue(storedRow());
      prisma.userAIToken.delete.mockResolvedValue(storedRow());

      const result: any = await service.remove("token-1", "learner-1");

      expect(result.token).not.toContain("abcdefghij");
      expect(result.token).toContain("...");
    });

    it("refuses to delete a key that belongs to another learner", async () => {
      prisma.userAIToken.findFirst.mockResolvedValue(null);

      const result = await service.remove("token-1", "someone-else");

      expect(result).toBeNull();
      expect(prisma.userAIToken.delete).not.toHaveBeenCalled();
    });
  });

  describe("masking", () => {
    it("hides a short secret completely", async () => {
      tx.userAIToken.findFirst.mockResolvedValue(storedRow());
      tx.userAIToken.update.mockResolvedValue(
        storedRow({ token: encryptSecret("short") }),
      );

      const result: any = await service.setDefault("token-1", "learner-1");

      expect(result.token).toBe("********");
    });

    it("reads a row written before encryption was introduced", async () => {
      tx.userAIToken.findFirst.mockResolvedValue(storedRow());
      tx.userAIToken.update.mockResolvedValue(
        storedRow({ token: "sk-legacy-plaintext-value" }),
      );

      const result: any = await service.setDefault("token-1", "learner-1");

      expect(result.token).toBe("sk-l...alue");
    });
  });
});
