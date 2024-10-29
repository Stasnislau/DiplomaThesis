import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "../../components/common/FormField";
import TextField from "../../components/common/TextField";
import {
  register,
  registerUserDtoSchema,
  RegisterUserRequest,
} from "../../api/mutations/register";

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
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
    await register(data);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 py-4 flex flex-col justify-center sm:py-12">
      <div className="relative py-1 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-6 bg-white shadow-lg sm:rounded-3xl sm:px-20 sm:py-8">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">
              Register
            </h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Email"
                    required={!registerUserDtoSchema.shape.email.optional}
                    error={errors.email?.message}
                  >
                    <TextField {...field} type="email" />
                  </FormField>
                )}
              />
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Name"
                    required={!registerUserDtoSchema.shape.name.optional}
                    error={errors.name?.message}
                  >
                    <TextField {...field} required />
                  </FormField>
                )}
              />
              <Controller
                name="surname"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Surname"
                    required={!registerUserDtoSchema.shape.surname.optional}
                    error={errors.surname?.message}
                  >
                    <TextField {...field} required />
                  </FormField>
                )}
              />
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Password"
                    required={!registerUserDtoSchema.shape.password.optional}
                    error={errors.password?.message}
                  >
                    <TextField {...field} type="password" required />
                  </FormField>
                )}
              />
              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Register
                </button>
              </div>
            </form>
            <div className="mt-2 text-center">
              <Link
                to="/login"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Already have an account? Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
