import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUser } from "./deleteUser";

vi.mock("../fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));

describe("deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on successful deletion", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        payload: "User deleted successfully",
      }),
    } as unknown as Response);

    const result = await deleteUser("user-123");

    expect(result).toBe(true);
  });

  it("throws error with message when deletion fails", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: false,
        payload: { message: "User not found" },
      }),
    } as unknown as Response);

    await expect(deleteUser("bad-id")).rejects.toThrow("User not found");
  });

  it("throws default error when no message provided", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: false,
        payload: {},
      }),
    } as unknown as Response);

    await expect(deleteUser("user-123")).rejects.toThrow("Failed to delete user");
  });

  it("calls fetchWithAuth with correct URL, method and user id", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    vi.mocked(fetchWithAuth).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    } as unknown as Response);

    await deleteUser("user-abc");

    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining("/auth/deleteUser/user-abc"),
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });
});
