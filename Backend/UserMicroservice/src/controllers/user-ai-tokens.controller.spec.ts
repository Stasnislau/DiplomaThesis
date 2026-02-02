import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { UserAITokensController } from "./user-ai-tokens.controller";
import { UserAITokensService } from "../services/user-ai-tokens.service";

describe("UserAITokensController", () => {
  let controller: UserAITokensController;
  let service: jest.Mocked<UserAITokensService>;

  const mockToken = {
    id: "token-123",
    userId: "user-123",
    token: "sk-test",
    aiProviderId: "openai",
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    aiProvider: { id: "openai", name: "OpenAI" },
  };

  const mockRequest = {
    user: {
      id: "user-123",
      email: "test@test.com",
      role: "USER",
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAITokensController],
      providers: [
        {
          provide: UserAITokensService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UserAITokensController>(UserAITokensController);
    service = module.get(
      UserAITokensService,
    ) as jest.Mocked<UserAITokensService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a token", async () => {
      service.create.mockResolvedValue(mockToken);

      const dto = { token: "sk-test", aiProviderId: "openai", isDefault: true };
      const result = await controller.create(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockToken);
      expect(service.create).toHaveBeenCalledWith("user-123", dto);
    });

    it("should throw BadRequestException on failure", async () => {
      service.create.mockResolvedValue(null);

      const dto = { token: "sk-test", aiProviderId: "openai", isDefault: true };

      await expect(controller.create(mockRequest, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findAll", () => {
    it("should return all tokens", async () => {
      service.findAllForUser.mockResolvedValue([mockToken]);

      const result = await controller.findAll(mockRequest);

      expect(result.success).toBe(true);
      expect(result.payload).toHaveLength(1);
      expect(service.findAllForUser).toHaveBeenCalledWith("user-123");
    });
  });

  describe("remove", () => {
    it("should remove a token", async () => {
      service.remove.mockResolvedValue(mockToken);

      const result = await controller.remove(mockRequest, "token-123");

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockToken);
      expect(service.remove).toHaveBeenCalledWith("token-123", "user-123");
    });

    it("should throw NotFoundException if token not found/owned", async () => {
      service.remove.mockResolvedValue(null);

      await expect(controller.remove(mockRequest, "token-123")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
