import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUserRole } from "./updateUserRole";

vi.mock("../fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));

describe("updateUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on successful role update", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        payload: "User role updated successfully",
      }),
    } as unknown as Response);

    const result = await updateUserRole({ id: "user-123", role: "ADMIN" });

    expect(result).toBe(true);
  });

  it("throws error with message when update fails", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: false,
        payload: { message: "User not found" },
      }),
    } as unknown as Response);

    await expect(
      updateUserRole({ id: "bad-id", role: "ADMIN" })
    ).rejects.toThrow("User not found");
  });

  it("throws default error when no message provided", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: false,
        payload: {},
      }),
    } as unknown as Response);

    await expect(
      updateUserRole({ id: "user-123", role: "USER" })
    ).rejects.toThrow("Failed to update user role");
  });

  it("calls fetchWithAuth with correct URL and method for ADMIN role", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    } as unknown as Response);

    await updateUserRole({ id: "user-123", role: "ADMIN" });

    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining("/auth/updateRole"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ id: "user-123", role: "ADMIN" }),
      })
    );
  });

  it("calls fetchWithAuth with correct body for USER role", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    } as unknown as Response);

    await updateUserRole({ id: "user-456", role: "USER" });

    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({ id: "user-456", role: "USER" }),
      })
    );
  });
});
