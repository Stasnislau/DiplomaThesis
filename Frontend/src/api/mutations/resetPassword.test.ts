import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPassword } from "./resetPassword";

vi.mock("../fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));

describe("resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on successful password reset", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        payload: "Password has been reset",
      }),
    } as unknown as Response);

    const result = await resetPassword("user@example.com");

    expect(result).toBe(true);
  });

  it("throws error with message when reset fails", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: false,
        payload: { message: "Email not found" },
      }),
    } as unknown as Response);

    await expect(resetPassword("nobody@example.com")).rejects.toThrow(
      "Email not found"
    );
  });

  it("throws default error when no message provided", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: false,
        payload: {},
      }),
    } as unknown as Response);

    await expect(resetPassword("user@example.com")).rejects.toThrow(
      "Failed to reset password"
    );
  });

  it("calls fetchWithAuth with correct URL, method and email in body", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    } as unknown as Response);

    await resetPassword("test@example.com");

    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining("/auth/resetPassword"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      })
    );
  });
});
