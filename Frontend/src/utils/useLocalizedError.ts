import { useTranslation } from "react-i18next";

/**
 * Translate a backend error code into a user-facing string in the current
 * UI language. Falls back to the supplied `rawMessage` (typically the
 * English fallback that came in the same `detail` payload from Bridge),
 * and finally to a generic "something went wrong" line.
 *
 * Usage:
 *
 *   const localize = useLocalizedError();
 *   try { ... } catch (err) {
 *     const text = localize(err); // ApiError, UploadMaterialError, plain Error all OK
 *     toast.error(text);
 *   }
 */
export function useLocalizedError() {
  const { t } = useTranslation();

  return (
    err: unknown,
    /** Optional override fallback (overrides `errors.generic`). */
    fallback?: string,
  ): string => {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: unknown }).code
        : undefined;
    const rawMessage =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "";

    if (typeof code === "string" && code.length > 0) {
      // i18next returns the key itself when no entry exists, so we use
      // defaultValue to fall through cleanly to the English message we
      // got from the server, then to the supplied fallback.
      return t(`errors.codes.${code}`, {
        defaultValue: rawMessage || fallback || t("errors.generic"),
      });
    }
    return rawMessage || fallback || t("errors.generic");
  };
}
