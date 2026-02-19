import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import {
  RegisterUserRequest,
  register,
  registerUserDtoSchema,
} from "@/api/mutations/register";

import Button from "@/components/common/Button";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import TextField from "@/components/common/TextField";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterUserRequest>({
    resolver: zodResolver(registerUserDtoSchema),
    defaultValues: {
      email: "",
      name: "",
      surname: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterUserRequest) => {
    setLoading(true);
    try {
      const response = await register(data);
      if (response === true) {
        navigate("/login");
      } else {
        setError(t("common.error"));
      }
    } catch (e: any) {
      setError(e.message || t("common.error"));
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
              {t('auth.signUp')}
            </h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField 
                    id="email"
                    label={t('auth.email')}
                    type="email" 
                    error={errors.email?.message}
                    required
                    {...field}
                  />
                )}
              />
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField 
                    id="name"
                    label={t('auth.name', 'Name')} // Fallback text
                    error={errors.name?.message}
                    required 
                    {...field} 
                  />
                )}
              />
              <Controller
                name="surname"
                control={control}
                render={({ field }) => (
                  <TextField 
                    id="surname"
                    label={t('auth.surname', 'Surname')} 
                    error={errors.surname?.message}
                    required 
                    {...field} 
                  />
                )}
              />
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField 
                    id="password"
                    label={t('auth.password')}
                    type="password" 
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
                  {t('auth.signUp')}
                </Button>
              </div>
            </form>
            
            {error && <p className="mt-4 text-center text-red-500 dark:text-red-400" role="alert">{error}</p>}

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('auth.hasAccount')} {t('auth.signIn')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
