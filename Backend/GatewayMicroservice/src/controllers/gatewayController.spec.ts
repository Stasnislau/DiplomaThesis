import { Request, Response } from "express";
import { Test, TestingModule } from "@nestjs/testing";

import { GatewayController } from "./gatewayController";
import { GatewayService } from "../services/gatewayService";

describe("GatewayController", () => {
  let controller: GatewayController;
  let gatewayService: jest.Mocked<GatewayService>;

  beforeEach(async () => {
    const mockGatewayService = {
      handleRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
      providers: [
        {
          provide: GatewayService,
          useValue: mockGatewayService,
        },
      ],
    }).compile();

    controller = module.get<GatewayController>(GatewayController);
    gatewayService = module.get(GatewayService) as jest.Mocked<GatewayService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("handleAuthRequests", () => {
    it("should delegate to gateway service and return response", async () => {
      const mockReq = {
        method: "POST",
        url: "/test",
        headers: {},
        body: {},
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockServiceResponse = {
        status: 200,
        data: { success: true },
      };

      gatewayService.handleRequest.mockResolvedValue(mockServiceResponse);

      await controller.handleAuthRequests(mockReq, mockRes);

      expect(gatewayService.handleRequest).toHaveBeenCalledWith(
        "POST",
        "/test",
        {},
        {},
        mockReq,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it("should handle service errors gracefully", async () => {
      const mockReq = {} as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      gatewayService.handleRequest.mockRejectedValue(
        new Error("Service failed"),
      );

      await controller.handleAuthRequests(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          payload: { message: "Gateway error" },
        }),
      );
    });
  });
});
