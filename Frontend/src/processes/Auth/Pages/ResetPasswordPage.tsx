import React, { useState } from "react";
import { Link } from "react-router-dom";
import { resetPassword } from "@/api/mutations/resetPassword";
import Button from "@/components/common/Button";
import TextField from "@/components/common/TextField";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { useTranslation } from "react-i18next";

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
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
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 dark:from-cyan-700 dark:to-blue-900 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl transition-all duration-300" />
        <div className="relative px-4 py-6 bg-white dark:bg-gray-800 shadow-lg sm:rounded-3xl sm:px-20 sm:py-8 transition-colors duration-300">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 text-center">
              {t("auth.forgotPassword")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              {t("auth.resetPasswordDescription") || "Enter your email and we'll send you a new password"}
            </p>

            {success ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700 dark:text-gray-200 font-medium">
                  {t("auth.resetPasswordSuccess") || "A new password has been sent to your email"}
                </p>
                <Link
                  to="/login"
                  className="inline-block text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                >
                  {t("auth.backToLogin") || "Back to Login"}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <TextField
                  id="reset-email"
                  type="email"
                  label={t("auth.email")}
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {error && (
                  <p className="text-sm text-red-500 dark:text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <div className="pt-2">
                  <Button
                    isLoading={loading}
                    type="submit"
                    className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white"
                  >
                    {t("auth.resetPassword") || "Reset Password"}
                  </Button>
                </div>

                <div className="mt-4 text-center">
                  <Link
                    to="/login"
                    className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {t("auth.rememberPassword") || "Remember your password?"} {t("auth.signIn")}
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
