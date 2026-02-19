import { LoginUserRequest, login, loginUserDtoSchema } from "./login";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetchWithAuth
vi.mock("../fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));

describe("login", () => {
  const mockLoginRequest: LoginUserRequest = {
    email: "test@example.com",
    password: "password123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tokens on successful login", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        payload: {
          accessToken: "access-token-123",
          refreshToken: "refresh-token-456",
        },
      }),
    };
    vi.mocked(fetchWithAuth).mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await login(mockLoginRequest);

    expect(result.success).toBe(true);
    expect(result.payload.accessToken).toBe("access-token-123");
    expect(result.payload.refreshToken).toBe("refresh-token-456");
  });

  it("throws error with message when login fails", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: false,
        payload: {
          message: "Invalid credentials",
        },
      }),
    };
    vi.mocked(fetchWithAuth).mockResolvedValue(
      mockResponse as unknown as Response,
    );

    await expect(login(mockLoginRequest)).rejects.toThrow(
      "Invalid credentials",
    );
  });

  it("throws default error when no message provided", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: false,
        payload: {},
      }),
    };
    vi.mocked(fetchWithAuth).mockResolvedValue(
      mockResponse as unknown as Response,
    );

    await expect(login(mockLoginRequest)).rejects.toThrow("Failed to login");
  });

  it("calls fetchWithAuth with correct URL and method", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        payload: { accessToken: "token", refreshToken: "refresh" },
      }),
    };
    vi.mocked(fetchWithAuth).mockResolvedValue(
      mockResponse as unknown as Response,
    );

    await login(mockLoginRequest);

    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(mockLoginRequest),
      }),
    );
  });

  it("validates email format via schema", () => {
    const validResult = loginUserDtoSchema.safeParse({
      email: "valid@email.com",
      password: "password",
    });
    expect(validResult.success).toBe(true);

    const invalidResult = loginUserDtoSchema.safeParse({
      email: "not-an-email",
      password: "password",
    });
    expect(invalidResult.success).toBe(false);
  });
});
