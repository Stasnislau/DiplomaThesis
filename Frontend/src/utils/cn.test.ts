import { describe, expect, it } from "vitest";

import cn from "./cn";

describe("cn (className utility)", () => {
  describe("basic usage", () => {
    it("returns empty string for no arguments", () => {
      expect(cn()).toBe("");
    });

    it("returns single class as-is", () => {
      expect(cn("foo")).toBe("foo");
    });

    it("combines multiple classes", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });
  });

  describe("conditional classes", () => {
    it("handles false values", () => {
      const condition = false;
      expect(cn("foo", condition && "bar")).toBe("foo");
    });

    it("handles true values", () => {
      const condition = true;
      expect(cn("foo", condition && "bar")).toBe("foo bar");
    });

    it("handles null and undefined", () => {
      expect(cn("foo", null, undefined, "bar")).toBe("foo bar");
    });

    it("handles object syntax", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("handles array syntax", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });
  });

  describe("tailwind merge", () => {
    it("merges conflicting tailwind classes", () => {
      // twMerge should keep the last conflicting class
      expect(cn("px-2", "px-4")).toBe("px-4");
    });

    it("merges background color classes", () => {
      expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    });

    it("preserves non-conflicting classes", () => {
      expect(cn("p-4", "m-2", "text-lg")).toBe("p-4 m-2 text-lg");
    });

    it("handles complex tailwind conflicts", () => {
      expect(cn("text-red-500 text-lg", "text-blue-500")).toBe(
        "text-lg text-blue-500",
      );
    });
  });

  describe("mixed usage", () => {
    it("handles mixed conditional and regular classes", () => {
      const isActive = true;
      const isDisabled = false;

      expect(
        cn("base-class", isActive && "active", isDisabled && "disabled", {
          "object-class": true,
        }),
      ).toBe("base-class active object-class");
    });

    it("handles className from component props", () => {
      const baseClasses = "rounded px-4 py-2";
      const customClassName = "custom-class";

      expect(cn(baseClasses, customClassName)).toBe(
        "rounded px-4 py-2 custom-class",
      );
    });
  });
});
