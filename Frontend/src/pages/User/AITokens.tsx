import React from "react";
import { Controller, useForm, SubmitHandler } from "react-hook-form";
import Button from "@/components/common/Button";
import TextField from "@/components/common/TextField";
import { TrashIcon } from "@/assets/icons";
import { useGetUserAITokens } from "@/api/hooks/useGetUserAITokens";
import { useCreateUserAIToken } from "@/api/hooks/useCreateUserAIToken";
import { useDeleteUserAIToken } from "@/api/hooks/useDeleteUserAIToken";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/Select";
import { AI_PROVIDERS } from "@/constants";
import IconButton from "@/components/common/IconButton";
import { Link } from "react-router-dom";
import Spinner from "@/components/common/Spinner";

interface IFormInput {
  aiProviderId: string;
  token: string;
}

// Brand colors for AI providers (light theme compatible)
const PROVIDER_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  openai: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "bg-emerald-100" },
  "google-geminis": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "bg-blue-100" },
  mistral: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "bg-orange-100" },
  claude: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "bg-amber-100" },
  deepseek: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", icon: "bg-cyan-100" },
  groq: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", icon: "bg-rose-100" },
};

const getProviderStyle = (providerId: string) => {
  return PROVIDER_STYLES[providerId] || { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: "bg-gray-100" };
};

const AITokensPage: React.FC = () => {
  const { data: aiTokens, isLoading } = useGetUserAITokens();
  const { mutate: createToken, isPending: isCreating } = useCreateUserAIToken();
  const { mutate: deleteToken } = useDeleteUserAIToken();

  const { register, handleSubmit, reset, control } = useForm<IFormInput>();

  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    createToken(data, {
      onSuccess: () => {
        reset();
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors duration-200 mb-6 group"
        >
          <span className="text-lg transition-transform duration-200 group-hover:-translate-x-1">←</span>
          <span className="font-medium">Back to Profile</span>
        </Link>

        {/* Header Card */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI Providers</h1>
              <p className="text-gray-500 text-sm sm:text-base">Connect your API keys to unlock advanced AI features</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Provider</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <Controller
                  name="aiProviderId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="h-12 bg-white border-gray-300 text-gray-900 rounded-lg focus:border-indigo-500 focus:ring-indigo-500">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 rounded-lg shadow-lg">
                        {AI_PROVIDERS.map((provider) => (
                          <SelectItem
                            key={provider.value}
                            value={provider.value}
                            className="text-gray-900 focus:bg-indigo-50 focus:text-indigo-900 rounded-md"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <TextField
                  {...register("token", { required: true })}
                  placeholder="sk-••••••••••••••••••••"
                  type="password"
                  className="h-12"
                />
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
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Connected Providers</h2>
            {aiTokens && aiTokens.length > 0 && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {aiTokens.length} active
              </span>
            )}
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size={32} color="#4F46E5" />
              <p className="text-gray-500 mt-4">Loading providers...</p>
            </div>
          )}
          
          {!isLoading && aiTokens?.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No providers connected</h3>
              <p className="text-gray-500 max-w-sm mx-auto">Add your first AI provider API key above to start using advanced language features.</p>
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
                    className={`group flex items-center justify-between rounded-2xl ${style.bg} border ${style.border} p-4 transition-all duration-200 hover:shadow-md`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl ${style.icon} flex items-center justify-center ${style.text} font-bold text-lg`}>
                        {providerLabel.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{providerLabel}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                          <p className="text-xs text-gray-500 font-mono tracking-wider">
                            ••••••••••••{token.token?.slice(-4) || "••••"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <IconButton
                      onClick={() => deleteToken(token.id)}
                      className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-gray-500 text-sm mt-6">
          🔒 Your API keys are encrypted and stored securely
        </p>
      </div>
    </div>
  );
};

export default AITokensPage;
