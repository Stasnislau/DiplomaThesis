import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import TextField from "@/components/common/TextField";
import FormField from "@/components/common/FormField";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { LoginUserRequest } from "@/api/mutations/login";
import { loginUserDtoSchema } from "@/api/mutations/login";

export const LoginPage: React.FC = () => {
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
        setError(result.message ?? "Unknown error");
        return;
      }
      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 py-4 flex flex-col justify-center sm:py-12">
      <div className="relative py-1 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-6 bg-white shadow-lg sm:rounded-3xl sm:px-20 sm:py-8">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
              Login
            </h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <FormField
                    label="Email"
                    className="block text-sm font-medium text-gray-700"
                    required={!loginUserDtoSchema.shape.email.isOptional}
                    error={errors.email?.message}
                  >
                    <TextField
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...field}
                    />
                  </FormField>
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <FormField
                    label="Password"
                    className="block text-sm font-medium text-gray-700"
                    error={errors.password?.message}
                    required={!loginUserDtoSchema.shape.password.isOptional}
                  >
                    <TextField
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormField>
                )}
              />
              <div>
                <Button
                  isLoading={loading}
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Login
                </Button>
              </div>
            </form>
            {error && <p className="text-red-500">{error}</p>}
            <div className="mt-6 text-center">
              <Link
                to="/register"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Don't have an account? Register
              </Link>
            </div>
            <div className="mt-2 text-center">
              <Link
                to="/reset-password"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
