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
import { AI_MODELS } from "@/constants";
import IconButton from "@/components/common/IconButton";

interface IFormInput {
  model: string;
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
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Manage AI Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Controller
                name="model"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
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
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Adding..." : "Add Token"}
            </Button>
          </form>
          <div className="mt-6 space-y-2">
            {isLoading && <p>Loading tokens...</p>}
            {aiTokens?.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-semibold">{token.model}</p>
                  <p className="text-sm text-gray-500">Token: ************</p>
                </div>
                <IconButton
                  onClick={() => deleteToken(token.id)}
                  className="cursor-pointer w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded-full"
                >
                  <TrashIcon className="h-6 w-6" />
                </IconButton>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AITokensPage;
