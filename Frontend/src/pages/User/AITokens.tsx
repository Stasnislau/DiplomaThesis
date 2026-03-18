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
import Spinner from "@/components/common/Spinner";
import TextField from "@/components/common/TextField";
import { TrashIcon } from "@/assets/icons";
import { useCreateUserAIToken } from "@/api/hooks/useCreateUserAIToken";
import { useDeleteUserAIToken } from "@/api/hooks/useDeleteUserAIToken";
import { useGetUserAITokens } from "@/api/hooks/useGetUserAITokens";
import { useSetDefaultUserAIToken } from "@/api/hooks/useSetDefaultUserAIToken";

interface IFormInput {
  aiProviderId: string;
  token: string;
  isDefault: boolean;
}

const PROVIDER_STYLES: Record<string, {
  bg: string; border: string; text: string; icon: string;
  darkBg: string; darkBorder: string; darkText: string; darkIcon: string;
}> = {
  openai: {
    bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "bg-emerald-100",
    darkBg: "dark:bg-emerald-900/20", darkBorder: "dark:border-emerald-700/50", darkText: "dark:text-emerald-400", darkIcon: "dark:bg-emerald-800/40",
  },
  "google-geminis": {
    bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "bg-blue-100",
    darkBg: "dark:bg-blue-900/20", darkBorder: "dark:border-blue-700/50", darkText: "dark:text-blue-400", darkIcon: "dark:bg-blue-800/40",
  },
  mistral: {
    bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "bg-orange-100",
    darkBg: "dark:bg-orange-900/20", darkBorder: "dark:border-orange-700/50", darkText: "dark:text-orange-400", darkIcon: "dark:bg-orange-800/40",
  },
  claude: {
    bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "bg-amber-100",
    darkBg: "dark:bg-amber-900/20", darkBorder: "dark:border-amber-700/50", darkText: "dark:text-amber-400", darkIcon: "dark:bg-amber-800/40",
  },
  deepseek: {
    bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", icon: "bg-cyan-100",
    darkBg: "dark:bg-cyan-900/20", darkBorder: "dark:border-cyan-700/50", darkText: "dark:text-cyan-400", darkIcon: "dark:bg-cyan-800/40",
  },
  groq: {
    bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", icon: "bg-rose-100",
    darkBg: "dark:bg-rose-900/20", darkBorder: "dark:border-rose-700/50", darkText: "dark:text-rose-400", darkIcon: "dark:bg-rose-800/40",
  },
};

const getProviderStyle = (providerId: string) => {
  return PROVIDER_STYLES[providerId] || {
    bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: "bg-gray-100",
    darkBg: "dark:bg-gray-800/40", darkBorder: "dark:border-gray-600/50", darkText: "dark:text-gray-400", darkIcon: "dark:bg-gray-700/40",
  };
};

const AITokensPage: React.FC = () => {
  const { data: aiTokens, isLoading } = useGetUserAITokens();
  const { mutate: createToken, isPending: isCreating } = useCreateUserAIToken();
  const { mutate: deleteToken } = useDeleteUserAIToken();
  const { setDefaultToken, isSettingDefault } = useSetDefaultUserAIToken();

  const { register, handleSubmit, reset, control } = useForm<IFormInput>({
    defaultValues: {
      isDefault: true,
    }
  });

  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    createToken(data, {
      onSuccess: () => {
        reset();
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back link */}
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 mb-6 group"
        >
          <span className="text-lg transition-transform duration-200 group-hover:-translate-x-1">←</span>
          <span className="font-medium">Back to Profile</span>
        </Link>

        {/* Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg dark:shadow-gray-900/50 p-8 mb-6 transition-colors duration-300">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">AI Providers</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Connect your API keys to unlock advanced AI features</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg dark:shadow-gray-900/50 p-8 mb-6 transition-colors duration-300">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Provider</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
                <Controller
                  name="aiProviderId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                        {AI_PROVIDERS.map((provider) => (
                          <SelectItem
                            key={provider.value}
                            value={provider.value}
                            className="text-gray-900 dark:text-gray-100 focus:bg-indigo-50 dark:focus:bg-indigo-900/30 focus:text-indigo-900 dark:focus:text-indigo-300 rounded-md"
                          >
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                <TextField
                  {...register("token", { required: true })}
                  placeholder="sk-••••••••••••••••••••"
                  type="password"
                  className="h-12"
                />
              </div>
              <div className="md:col-span-12 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  {...register("isDefault")}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded accent-indigo-600"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">Set as default provider</label>
              </div>
              <div className="md:col-span-3 flex items-end">
                <Button
                  type="submit"
                  disabled={isCreating}
                  variant="primary"
                  className="h-12 w-full bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold"
                >
                  {isCreating ? "Adding..." : "Add Key"}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Tokens List Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg dark:shadow-gray-900/50 p-8 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Providers</h2>
            {aiTokens && aiTokens.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                {aiTokens.length} active
              </span>
            )}
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size={32} color="#4F46E5" />
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading providers...</p>
            </div>
          )}

          {!isLoading && aiTokens?.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No providers connected</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Add your first AI provider API key above to start using advanced language features.</p>
            </div>
          )}

          {!isLoading && aiTokens && aiTokens.length > 0 && (
            <div className="space-y-3">
              {aiTokens.map((token) => {
                const providerLabel =
                  token.aiProvider?.name ||
                  AI_PROVIDERS.find((p) => p.value === token.aiProviderId)?.label ||
                  token.aiProviderId;

                const style = getProviderStyle(token.aiProviderId);

                return (
                  <div
                    key={token.id}
                    className={`group flex items-center justify-between rounded-2xl ${style.bg} ${style.darkBg} border ${style.border} ${style.darkBorder} p-4 transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/50`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl ${style.icon} ${style.darkIcon} flex items-center justify-center ${style.text} ${style.darkText} font-bold text-lg`}>
                        {providerLabel.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{providerLabel}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono tracking-wider">
                            ••••••••••••{token.token?.slice(-4) || "••••"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {token.isDefault && (
                        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-semibold px-2.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-700/50 flex items-center gap-1">
                          <span role="img" aria-label="star">⭐</span> Default
                        </span>
                      )}

                      {!token.isDefault && (
                        <Button
                          variant="secondary"
                          onClick={() => setDefaultToken(token.id)}
                          disabled={isSettingDefault}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded"
                        >
                          Make Default
                        </Button>
                      )}

                      <IconButton
                        onClick={() => deleteToken(token.id)}
                        className="h-10 w-10 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
          🔒 Your API keys are encrypted and stored securely
        </p>
      </div>
    </div>
  );
};

export default AITokensPage;
