import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { LoginUserRequest, loginUserDtoSchema } from "@/api/mutations/login";
import React, { useState } from "react";

import Button from "@/components/common/Button";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import TextField from "@/components/common/TextField";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginUserRequest>({
    resolver: zodResolver(loginUserDtoSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { login } = useAuthStore();

  const onSubmit = async (input: LoginUserRequest) => {
    try {
      setLoading(true);
      const result = await login(input);
      if (!result.success) {
        const msg =
          result.errors?.join("\n") ||
          result.message ||
          t('common.error');
        setError(msg);
        return;
      }
      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-4 flex flex-col justify-center sm:py-12 transition-colors duration-300">
      <div className="absolute top-4 right-4 flex gap-2">
        <ThemeToggle />
        <LanguageSelector />
      </div>

      <div className="relative py-1 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 dark:from-cyan-700 dark:to-blue-900 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl transition-all duration-300"></div>
        <div className="relative px-4 py-6 bg-white dark:bg-gray-800 shadow-lg sm:rounded-3xl sm:px-20 sm:py-8 transition-colors duration-300">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6 text-center">
              {t('auth.signIn')}
            </h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <TextField
                    id="email"
                    type="email"
                    label={t('auth.email')}
                    autoComplete="email"
                    error={errors.email?.message}
                    required
                    {...field}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <TextField
                    id="password"
                    type="password"
                    label={t('auth.password')}
                    autoComplete="current-password"
                    error={errors.password?.message}
                    required
                    {...field}
                  />
                )}
              />
              <div className="pt-2">
                <Button
                  isLoading={loading}
                  type="submit"
                  className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white"
                >
                  {t('auth.signIn')}
                </Button>
              </div>
            </form>
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md" role="alert">
                {error.split("\n").map((line, i) => (
                  <p key={i} className="text-sm text-red-600 dark:text-red-400">
                    {line}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-6 text-center">
              <Link
                to="/register"
                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('auth.noAccount')} {t('auth.signUp')}
              </Link>
            </div>
            <div className="mt-2 text-center">
              <Link
                to="/reset-password"
                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
