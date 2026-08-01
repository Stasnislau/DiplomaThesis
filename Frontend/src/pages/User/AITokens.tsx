import { Controller, SubmitHandler, useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/Select";

import { AI_PROVIDERS } from "@/constants";
import Button from "@/components/common/Button";
import IconButton from "@/components/common/IconButton";
import { Link } from "react-router-dom";
import React from "react";
import Skeleton from "@/components/common/Skeleton";
import TextField from "@/components/common/TextField";
import { TrashIcon } from "@/assets/icons";
import cn from "@/utils/cn";
import { useCreateUserAIToken } from "@/api/hooks/useCreateUserAIToken";
import { useDeleteUserAIToken } from "@/api/hooks/useDeleteUserAIToken";
import { useGetUserAITokens } from "@/api/hooks/useGetUserAITokens";
import { useSetDefaultUserAIToken } from "@/api/hooks/useSetDefaultUserAIToken";
import { useVerifyAIToken } from "@/api/hooks/useVerifyAIToken";
import { useLocalizedError } from "@/utils/useLocalizedError";
import { useToastsStore } from "@/store/useToastsStore";
import { useTranslation } from "react-i18next";

interface IFormInput {
  aiProviderId: string;
  token: string;
  isDefault: boolean;
}

const PROVIDER_TILE: Record<string, string> = {
  openai: "bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300",
  "google-geminis": "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300",
  mistral: "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300",
  claude: "bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300",
  deepseek: "bg-cyan-100 text-cyan-700 dark:bg-cyan-800/40 dark:text-cyan-300",
  groq: "bg-rose-100 text-rose-700 dark:bg-rose-800/40 dark:text-rose-300",
  openrouter: "bg-violet-100 text-violet-700 dark:bg-violet-800/40 dark:text-violet-300",
};

const getProviderTile = (providerId: string): string =>
  PROVIDER_TILE[providerId] ||
  "bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300";

const ACTION_BUTTON_BASE =
  "h-9 inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-800";

const AITokensPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: aiTokens, isLoading, error: tokensError } = useGetUserAITokens();
  const { mutate: createToken, isPending: isCreating } = useCreateUserAIToken();
  const { mutate: deleteToken, isPending: isDeleting, variables: deletingId } = useDeleteUserAIToken();
  const { setDefaultToken, isSettingDefault } = useSetDefaultUserAIToken();
  const { verifyTokenAsync } = useVerifyAIToken();
  const addToast = useToastsStore((s) => s.addToast);
  const localizeError = useLocalizedError();
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = React.useState<
    Record<string, "valid" | "invalid">
  >({});
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(
    null,
  );

  const requestDelete = (tokenId: string) => {
    if (pendingDeleteId !== tokenId) {
      setPendingDeleteId(tokenId);
      return;
    }
    deleteToken(tokenId, {
      onSuccess: () => {
        setPendingDeleteId(null);
        addToast({
          title: t("aiTokens.tokenDeletedTitle"),
          content: t("aiTokens.tokenDeletedBody"),
          severity: "success",
        });
      },
      onError: (err: Error) => {
        addToast({
          title: t("aiTokens.tokenDeleteFailedTitle"),
          content: localizeError(err),
          severity: "error",
        });
      },
    });
  };

  const handleVerify = async (tokenId: string) => {
    setVerifyingId(tokenId);
    try {
      const result = await verifyTokenAsync({ tokenId });
      setVerifyStatus((s) => ({
        ...s,
        [tokenId]: result.valid ? "valid" : "invalid",
      }));
      addToast({
        title: result.valid
          ? t("aiTokens.verifyValidTitle")
          : t("aiTokens.verifyInvalidTitle"),
        content: result.message,
        severity: result.valid ? "success" : "error",
      });
    } catch (e) {
      setVerifyStatus((s) => ({ ...s, [tokenId]: "invalid" }));
      addToast({
        title: t("aiTokens.verifyInvalidTitle"),
        content: localizeError(e),
        severity: "error",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const { register, handleSubmit, reset, control } = useForm<IFormInput>({
    defaultValues: {
      isDefault: true,
    }
  });

  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    createToken(data, {
      onSuccess: () => {
        reset();
        addToast({
          title: t("aiTokens.tokenAddedTitle"),
          content: t("aiTokens.tokenAddedBody"),
          severity: "success",
        });
      },
      onError: (err: Error) => {
        addToast({
          title: t("aiTokens.tokenAddFailedTitle"),
          content: err.message,
          severity: "error",
        });
      },
    });
  };

  const labelForToken = (token: { aiProviderId: string; aiProvider?: { name: string } }): string =>
    token.aiProvider?.name ||
    AI_PROVIDERS.find((p) => p.value === token.aiProviderId)?.label ||
    token.aiProviderId;

  const defaultToken = aiTokens?.find((token) => token.isDefault);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 group"
        >
          <span aria-hidden="true" className="text-lg transition-transform duration-200 group-hover:-translate-x-1">←</span>
          <span className="font-medium">{t("aiTokens.backToProfile")}</span>
        </Link>

        {}
        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg dark:shadow-gray-900/50 p-6 sm:p-8 transition-colors duration-300">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
              <svg aria-hidden="true" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t("aiTokens.heading")}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{t("aiTokens.headingSubtitle")}</p>
            </div>
          </div>

          {!isLoading && !tokensError && (
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("aiTokens.defaultProviderLabel")}
              </span>
              {defaultToken ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 px-3 py-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
                  <span aria-hidden="true">⭐</span>
                  {labelForToken(defaultToken)}
                </span>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("aiTokens.noDefaultYet")}
                </span>
              )}
            </div>
          )}
        </section>

        {}
        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg dark:shadow-gray-900/50 p-6 sm:p-8 transition-colors duration-300">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("aiTokens.addNewProvider")}</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span
                    id="ai-provider-label"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
                  >
                    {t("aiTokens.provider")}
                  </span>
                  <Controller
                    name="aiProviderId"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger
                          aria-labelledby="ai-provider-label"
                          className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                        >
                          <SelectValue placeholder={t("aiTokens.selectProvider")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg shadow-lg">
                          {AI_PROVIDERS.map((provider) => (
                            <SelectItem
                              key={provider.value}
                              value={provider.value}
                              className="focus:bg-indigo-50 dark:focus:bg-indigo-900/30 focus:text-indigo-900 dark:focus:text-indigo-300 rounded-md"
                            >
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <TextField
                  {...register("token", { required: true })}
                  label={t("aiTokens.apiKey")}
                  placeholder={t("aiTokens.apiKeyPlaceholder")}
                  type="password"
                  autoComplete="off"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  {t("aiTokens.whereToGetKey")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {AI_PROVIDERS.map((provider) => (
                    <a
                      key={provider.value}
                      href={provider.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      {provider.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  {...register("isDefault")}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded accent-indigo-600"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">{t("aiTokens.setAsDefault")}</label>
              </div>
              <Button
                type="submit"
                disabled={isCreating}
                variant="primary"
                className="w-full sm:w-auto sm:min-w-[11rem] bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 rounded-lg font-semibold"
              >
                {isCreating ? t("aiTokens.adding") : t("aiTokens.addKey")}
              </Button>
            </div>
          </form>
        </section>

        {}
        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg dark:shadow-gray-900/50 p-6 sm:p-8 transition-colors duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("aiTokens.connectedProviders")}</h2>
            {aiTokens && aiTokens.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                {t("aiTokens.activeCount", { count: aiTokens.length })}
              </span>
            )}
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="flex items-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4"
                >
                  <Skeleton variant="rounded" width="w-12" height="h-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="w-1/3" />
                    <Skeleton variant="text" width="w-1/4" height="h-3" />
                  </div>
                  <Skeleton variant="rounded" width="w-24" height="h-9" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && tokensError && (
            <div
              role="alert"
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex items-start gap-3"
            >
              <svg aria-hidden="true" className="h-6 w-6 flex-shrink-0 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
              <div className="min-w-0">
                <p className="text-red-700 dark:text-red-300 font-medium">
                  {t("aiTokens.tokensFetchFailedTitle")}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 break-words">
                  {localizeError(tokensError)}
                </p>
              </div>
            </div>
          )}

          {!isLoading && !tokensError && aiTokens?.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 px-6 py-12 text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("aiTokens.noProvidersTitle")}</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-sm sm:text-base">{t("aiTokens.noProvidersBody")}</p>
            </div>
          )}

          {!isLoading && !tokensError && aiTokens && aiTokens.length > 0 && (
            <ul className="space-y-3">
              {aiTokens.map((token) => {
                const providerLabel = labelForToken(token);
                const isRowDeleting = isDeleting && deletingId === token.id;

                return (
                  <li
                    key={token.id}
                    className={cn(
                      "rounded-2xl border p-4 transition-shadow duration-200 hover:shadow-md dark:hover:shadow-gray-900/50",
                      token.isDefault
                        ? "border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-900/10 ring-1 ring-amber-300/60 dark:ring-amber-700/40"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60",
                    )}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          aria-hidden="true"
                          className={cn(
                            "h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-lg",
                            getProviderTile(token.aiProviderId),
                          )}
                        >
                          {providerLabel.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{providerLabel}</p>
                            {token.isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
                                <span aria-hidden="true">⭐</span> {t("aiTokens.defaultBadge")}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span
                              className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"
                              title={t("aiTokens.activeTooltip")}
                            >
                              <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                              {t("aiTokens.activeLabel")}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tracking-wider">
                              ••••••••••••{token.token?.slice(-4) || "••••"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
                        {!token.isDefault && (
                          <button
                            type="button"
                            onClick={() => setDefaultToken(token.id)}
                            disabled={isSettingDefault}
                            className={cn(
                              ACTION_BUTTON_BASE,
                              "border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 focus:ring-indigo-500",
                            )}
                          >
                            {t("aiTokens.makeDefault")}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleVerify(token.id)}
                          disabled={verifyingId === token.id}
                          className={cn(
                            ACTION_BUTTON_BASE,
                            "focus:ring-emerald-500",
                            verifyStatus[token.id] === "valid"
                              ? "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                              : verifyStatus[token.id] === "invalid"
                              ? "border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50"
                              : "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/40",
                          )}
                        >
                          {verifyingId === token.id ? (
                            <>
                              <span aria-hidden="true" className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              {t("aiTokens.verifying")}
                            </>
                          ) : verifyStatus[token.id] === "valid" ? (
                            <>
                              <span aria-hidden="true">✓</span>
                              {t("aiTokens.verified")}
                            </>
                          ) : verifyStatus[token.id] === "invalid" ? (
                            <>
                              <span aria-hidden="true">✗</span>
                              {t("aiTokens.verifyFailed")}
                            </>
                          ) : (
                            t("aiTokens.verify")
                          )}
                        </button>

                        {pendingDeleteId === token.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => requestDelete(token.id)}
                              disabled={isRowDeleting}
                              aria-label={t("aiTokens.confirmDeleteAriaLabel", { provider: providerLabel })}
                              className={cn(
                                ACTION_BUTTON_BASE,
                                "font-semibold border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 focus:ring-red-500",
                              )}
                            >
                              {isRowDeleting ? (
                                <span aria-hidden="true" className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : null}
                              {t("aiTokens.confirmDeleteButton")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              disabled={isRowDeleting}
                              className={cn(
                                ACTION_BUTTON_BASE,
                                "border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-400",
                              )}
                            >
                              {t("aiTokens.cancelDeleteButton")}
                            </button>
                          </>
                        ) : (
                          <IconButton
                            onClick={() => requestDelete(token.id)}
                            aria-label={t("aiTokens.deleteAriaLabel", { provider: providerLabel })}
                            title={t("aiTokens.deleteToken")}
                            className="h-9 w-9 flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </IconButton>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {}
        <details className="group bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-3xl overflow-hidden">
          <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between gap-3 text-base font-semibold text-indigo-900 dark:text-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <span>{t("aiTokens.disclaimerTitle")}</span>
            <svg
              aria-hidden="true"
              className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 pb-6 space-y-3">
            <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed">
              {t("aiTokens.disclaimerBody")}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2 leading-relaxed">
              {t("aiTokens.billingNotice")}
            </p>
            <p className="text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl px-3 py-2 leading-relaxed">
              {t("aiTokens.securityNotice")}
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 italic">
              🔒 {t("aiTokens.privacyNote")}
            </p>
          </div>
        </details>

        <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
          🔒 {t("aiTokens.keysEncrypted")}
        </p>
      </div>
    </div>
  );
};

export default AITokensPage;
