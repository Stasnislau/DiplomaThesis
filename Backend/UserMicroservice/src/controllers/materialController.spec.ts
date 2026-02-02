import { Test, TestingModule } from "@nestjs/testing";

import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { MaterialController } from "./materialController";
import { MaterialService } from "../services/materialService";
import { NotFoundException } from "@nestjs/common";

describe("MaterialController", () => {
  let controller: MaterialController;
  let service: jest.Mocked<MaterialService>;

  const mockMaterial = {
    id: "material-123",
    userId: "user-123",
    filename: "test.pdf",
    analyzedTypes: ["grammar"],
    createdAt: new Date(),
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
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialController],
      providers: [
        {
          provide: MaterialService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MaterialController>(MaterialController);
    service = module.get(MaterialService) as jest.Mocked<MaterialService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create material", async () => {
      service.create.mockResolvedValue(mockMaterial);

      const dto = { filename: "test.pdf", analyzedTypes: ["grammar"] };
      const result = await controller.create(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockMaterial);
      expect(service.create).toHaveBeenCalledWith("user-123", dto);
    });
  });

  describe("findAll", () => {
    it("should return all materials", async () => {
      service.findAllForUser.mockResolvedValue([mockMaterial]);

      const result = await controller.findAll(mockRequest);

      expect(result.success).toBe(true);
      expect(result.payload).toHaveLength(1);
      expect(service.findAllForUser).toHaveBeenCalledWith("user-123");
    });
  });

  describe("findOne", () => {
    it("should return specific material", async () => {
      service.findOne.mockResolvedValue(mockMaterial);

      const result = await controller.findOne(mockRequest, "material-123");

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockMaterial);
      expect(service.findOne).toHaveBeenCalledWith("material-123", "user-123");
    });

    it("should throw NotFoundException when material not found", async () => {
      service.findOne.mockResolvedValue(null);

      await expect(
        controller.findOne(mockRequest, "material-123"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
