import React from "react";
import { Controller, useForm, SubmitHandler } from "react-hook-form";
import Button from "@/components/common/Button";
import TextField from "@/components/common/TextField";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
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

interface IFormInput {
  aiProviderId: string;
  token: string;
}

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/profile"
            className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
          >
            <span className="mr-2 text-xl">←</span> Back to Profile
          </Link>
        </div>

        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 pb-6">
            <CardTitle className="text-2xl font-bold text-gray-800">Manage AI Providers</CardTitle>
            <p className="text-gray-500 mt-2">Connect your AI provider API keys to enable advanced features.</p>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Controller
                  name="aiProviderId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.map((provider) => (
                          <SelectItem
                            key={provider.value}
                            value={provider.value}
                          >
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <TextField
                  {...register("token", { required: true })}
                  placeholder="API Token"
                  type="password"
                  className="md:col-span-2"
                />
              </div>
              <Button type="submit" disabled={isCreating} className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-200 transform hover:-translate-y-0.5">
                {isCreating ? "Adding Token..." : "Add Provider Token"}
              </Button>
            </form>
            <div className="mt-8 space-y-4">
              {isLoading && <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}
              {!isLoading && aiTokens?.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p>No providers configured yet.</p>
                </div>
              )}
              {aiTokens?.map((token) => {
                // Prefer the name from the relation (token.aiProvider?.name) if available,
                // otherwise fallback to the local constant map for better UX.
                const providerLabel = 
                    token.aiProvider?.name || 
                    AI_PROVIDERS.find(p => p.value === token.aiProviderId)?.label || 
                    token.aiProviderId;

                return (
                  <div
                    key={token.id}
                    className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-100 uppercase">
                         {providerLabel.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{providerLabel}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1 tracking-wider">
                          ••••••••••••••••{token.token?.slice(-4) || "****"}
                        </p>
                      </div>
                    </div>
                    <IconButton
                      onClick={() => deleteToken(token.id)}
                      className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AITokensPage;
