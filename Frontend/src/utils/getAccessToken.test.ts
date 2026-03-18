import { beforeEach, describe, expect, it } from "vitest";

import { getAccessToken } from "./getAccessToken";

describe("getAccessToken", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no token is stored", () => {
    expect(getAccessToken()).toBe(null);
  });

  it("returns the stored access token", () => {
    const testToken = "test-access-token-123";
    localStorage.setItem("accessToken", testToken);

    expect(getAccessToken()).toBe(testToken);
  });

  it("returns the correct token after update", () => {
    localStorage.setItem("accessToken", "old-token");
    localStorage.setItem("accessToken", "new-token");

    expect(getAccessToken()).toBe("new-token");
  });

  it("returns null after token is removed", () => {
    localStorage.setItem("accessToken", "some-token");
    localStorage.removeItem("accessToken");

    expect(getAccessToken()).toBe(null);
  });

  it("handles empty string as valid token", () => {
    localStorage.setItem("accessToken", "");

    expect(getAccessToken()).toBe("");
  });

  it("returns null after localStorage is cleared", () => {
    localStorage.setItem("accessToken", "token");
    localStorage.clear();

    expect(getAccessToken()).toBe(null);
  });
});
