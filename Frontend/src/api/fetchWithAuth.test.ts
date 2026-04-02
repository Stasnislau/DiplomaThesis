import * as getAccessTokenModule from "@/utils/getAccessToken";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithAuth } from "./fetchWithAuth";
import { useAuthStore } from "@/store/useAuthStore";

vi.mock("@/utils/getAccessToken", () => ({
  getAccessToken: vi.fn(),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("fetchWithAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should append authorization header with access token", async () => {
    vi.spyOn(getAccessTokenModule, "getAccessToken").mockReturnValue(
      "test-token",
    );
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ success: true }),
    });

    await fetchWithAuth("http://api.example.com", { method: "GET" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("should set Content-Type to application/json if body is provided and not FormData", async () => {
    vi.spyOn(getAccessTokenModule, "getAccessToken").mockReturnValue(
      "test-token",
    );
    mockFetch.mockResolvedValueOnce({
      status: 200,
    });

    await fetchWithAuth("http://api.example.com", {
      method: "POST",
      body: JSON.stringify({ prop: "value" }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("should not set Content-Type to application/json if FormData is provided", async () => {
    vi.spyOn(getAccessTokenModule, "getAccessToken").mockReturnValue(
      "test-token",
    );
    mockFetch.mockResolvedValueOnce({
      status: 200,
    });

    const formData = new FormData();
    formData.append("file", new Blob());

    await fetchWithAuth("http://api.example.com", {
      method: "POST",
      body: formData,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.example.com",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("should handle 401 response and retry with new token", async () => {
    vi.spyOn(getAccessTokenModule, "getAccessToken")
      .mockReturnValueOnce("old-token")
      .mockReturnValueOnce("new-token");

    const mockRefresh = vi.fn().mockResolvedValue(true);
    vi.mocked(useAuthStore.getState).mockReturnValue({
      refresh: mockRefresh,
    } as any);

    mockFetch.mockResolvedValueOnce({
      status: 401,
    });
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ success: true }),
    });

    await fetchWithAuth("http://api.example.com", { method: "GET" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "http://api.example.com",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer old-token" }),
      }),
    );
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://api.example.com",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer new-token" }),
      }),
    );
  });
});
