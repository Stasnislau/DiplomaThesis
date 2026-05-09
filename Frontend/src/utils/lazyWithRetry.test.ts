import { describe, expect, it } from "vitest";

import { isChunkLoadError } from "./lazyWithRetry";

describe("isChunkLoadError", () => {
  it("recognises ChunkLoadError by name", () => {
    const err = new Error("anything");
    err.name = "ChunkLoadError";
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("recognises Vite's 'Failed to fetch dynamically imported module'", () => {
    expect(
      isChunkLoadError(
        new Error(
          "Failed to fetch dynamically imported module: https://example.com/assets/Tasks-X7Y8Z9.js",
        ),
      ),
    ).toBe(true);
  });

  it("recognises the MIME-type variant from the stale-tab bug", () => {
    expect(
      isChunkLoadError(
        new Error(
          "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of \"text/html\"",
        ),
      ),
    ).toBe(true);
  });

  it("recognises webpack-style 'Loading chunk N failed'", () => {
    expect(
      isChunkLoadError(new Error("Loading chunk 42 failed.")),
    ).toBe(true);
  });

  it("recognises 'error loading dynamically imported module'", () => {
    expect(
      isChunkLoadError(
        new Error("error loading dynamically imported module"),
      ),
    ).toBe(true);
  });

  it("does NOT match unrelated runtime errors", () => {
    expect(
      isChunkLoadError(new TypeError("Cannot read properties of undefined")),
    ).toBe(false);
  });

  it("does NOT match plain network errors with no chunk signal", () => {
    expect(isChunkLoadError(new Error("Network request failed"))).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isChunkLoadError("string thrown")).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError({ message: "looks like an error" })).toBe(false);
  });
});
