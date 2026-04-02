import { ErrorHandlingMiddleware } from "./errorHandlingMiddleware";
import { InternalServerErrorException, HttpException, BadRequestException } from "@nestjs/common";

describe("ErrorHandlingMiddleware", () => {
  let middleware: ErrorHandlingMiddleware;
  let mockHost: any;
  let mockResponse: any;

  beforeEach(() => {
    middleware = new ErrorHandlingMiddleware();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("catch", () => {
    it("should handle HttpException correctly", () => {
      const error = new HttpException("Not Found Error", 404);
      middleware.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          payload: expect.objectContaining({
            message: "Not Found Error",
            timestamp: expect.any(String)
          })
        })
      );
    });

    it("should handle BadRequestException and extract validation errors", () => {
      const bError = new BadRequestException({ message: ["validation email failed"], error: "Bad Request" });
      middleware.catch(bError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          payload: expect.objectContaining({
            message: "Bad Request Exception", // NestJS default message wrapper for plain BadRequestException
            errors: ["validation email failed"]
          })
        })
      );
    });

    it("should fallback to InternalServerErrorException for generic Errors", () => {
      const genericError = new Error("Something broke globally");
      middleware.catch(genericError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          payload: expect.objectContaining({
            message: "Something broke globally",
          })
        })
      );
    });
  });
});
