import { useTranslation } from "react-i18next";

export function useLocalizedError() {
  const { t } = useTranslation();

  return (
    err: unknown,
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
      return t(`errors.codes.${code}`, {
        defaultValue: rawMessage || fallback || t("errors.generic"),
      });
    }
    return rawMessage || fallback || t("errors.generic");
  };
}
