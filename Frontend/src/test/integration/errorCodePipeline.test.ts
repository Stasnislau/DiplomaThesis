import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";

import i18n from "@/config/i18n";
import { ApiError } from "@/api/extractApiError";
import { parseApiResponse } from "@/api/parseApiResponse";
import { useLocalizedError } from "@/utils/useLocalizedError";

const SAMPLE_CODES = [
  "AUTH_MISSING_USER",
  "PDF_NO_TEXT",
  "AI_RATE_LIMITED",
  "USER_TOKENS_EMPTY",
  "AUTH_INVALID_CREDENTIALS",
  "AUTH_EMAIL_TAKEN",
  "AUTH_REFRESH_TOKEN_EXPIRED",
  "USER_NOT_FOUND",
  "USER_LANGUAGE_ALREADY_ADDED",
  "USER_AI_TOKEN_NOT_FOUND",
];

const LOCALES: Array<"en" | "pl" | "es"> = ["en", "pl", "es"];

function fastApiResponse(code: string, message: string, status = 400): Response {
  return new Response(JSON.stringify({ detail: `${code}: ${message}` }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function gatewayWrappedResponse(
  code: string,
  message: string,
  status = 400,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      payload: { message: `${code}: ${message}` },
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

describe("error-code contract end-to-end", () => {
  describe("parseApiResponse extracts the code from both wire shapes", () => {
    it.each(SAMPLE_CODES)(
      "FastAPI {detail} → ApiError(%s)",
      async (code) => {
        const response = fastApiResponse(code, "english fallback");
        let captured: unknown;
        try {
          await parseApiResponse(response, "fallback");
        } catch (err) {
          captured = err;
        }
        expect(captured).toBeInstanceOf(ApiError);
        expect((captured as ApiError).code).toBe(code);
        expect((captured as ApiError).message).toBe("english fallback");
      },
    );

    it.each(SAMPLE_CODES)(
      "Gateway-wrapped {payload.message} → ApiError(%s)",
      async (code) => {
        const response = gatewayWrappedResponse(code, "english fallback");
        let captured: unknown;
        try {
          await parseApiResponse(response, "fallback");
        } catch (err) {
          captured = err;
        }
        expect(captured).toBeInstanceOf(ApiError);
        expect((captured as ApiError).code).toBe(code);
      },
    );
  });

  describe("useLocalizedError picks up the catalog entry", () => {
    it.each(LOCALES)(
      "every sampled code has a non-key translation in %s",
      async (locale) => {
        await i18n.changeLanguage(locale);
        const { result } = renderHook(() => useLocalizedError());

        for (const code of SAMPLE_CODES) {
          const err = new ApiError(code, "english fallback");
          const text = result.current(err);
          expect(text, `missing translation for ${code} in ${locale}`).not.toBe(
            `errors.codes.${code}`,
          );
          if (locale !== "en") {
            expect(text, `${code} not actually translated in ${locale}`)
              .not.toBe("english fallback");
          }
          expect(text.length).toBeGreaterThan(0);
        }
      },
    );

    it("falls back to the English message when the code is unmapped", async () => {
      await i18n.changeLanguage("en");
      const { result } = renderHook(() => useLocalizedError());
      const err = new ApiError("BOGUS_NEVER_DEFINED", "best-effort fallback");
      expect(result.current(err)).toBe("best-effort fallback");
    });

    it("falls back to errors.generic when there's no code at all", async () => {
      await i18n.changeLanguage("en");
      const { result } = renderHook(() => useLocalizedError());
      const text = result.current(new Error(""));
      expect(text).toBe(i18n.t("errors.generic"));
    });
  });
});
