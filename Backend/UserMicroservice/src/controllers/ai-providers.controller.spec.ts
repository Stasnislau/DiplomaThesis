import { Test, TestingModule } from "@nestjs/testing";

import { AiProvidersController } from "./ai-providers.controller";
import { AiProvidersService } from "../services/ai-providers.service";

describe("AiProvidersController", () => {
  let controller: AiProvidersController;
  let service: jest.Mocked<AiProvidersService>;

  const mockProviders = [
    { id: "openai", name: "OpenAI", createdAt: new Date() },
    { id: "google", name: "Google", createdAt: new Date() },
  ];

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiProvidersController],
      providers: [
        {
          provide: AiProvidersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AiProvidersController>(AiProvidersController);
    service = module.get(AiProvidersService) as jest.Mocked<AiProvidersService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all providers", async () => {
      service.findAll.mockResolvedValue(mockProviders);

      const result = await controller.findAll();

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockProviders);
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});
