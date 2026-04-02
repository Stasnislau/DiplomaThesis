import { urlMiddleware } from "./urlMiddleware";
import { NotFoundException } from "@nestjs/common";

describe("urlMiddleware", () => {
  let mockHost: any;
  let mockResponse: any;
  let middlewareObj: any;

  beforeEach(() => {
    middlewareObj = urlMiddleware();
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

  it("should catch NotFoundException and return fixed response", () => {
    const ex = new NotFoundException("Not Found");
    middlewareObj.catch(ex, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      payload: "Not Found",
    });
  });

  it("should not modify response if exception is not NotFoundException", () => {
    const ex = new Error("Generic error");
    middlewareObj.catch(ex, mockHost);

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});
