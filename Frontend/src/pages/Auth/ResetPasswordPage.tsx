import React, { useState } from "react";
import { Link } from "react-router-dom";

export const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement password reset logic here
    console.log("Password reset attempt for:", email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 py-4 flex flex-col justify-center sm:py-12">
      <div className="relative py-1 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-6 bg-white shadow-lg sm:rounded-3xl sm:px-20 sm:py-8">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
              Reset Password
            </h1>
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Reset Password
                </button>
              </div>
            </form>
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Remember your password? Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
