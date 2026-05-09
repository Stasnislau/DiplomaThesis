import React, { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import Button from "@/components/common/Button";
import TextField from "@/components/common/TextField";
import { useUpdatePassword } from "@/api/hooks/useUpdatePassword";
import Spinner from "@/components/common/Spinner";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IFormInput {
  currentPassword: "";
  newPassword: "";
  confirmPassword: "";
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset: resetForm,
    formState: { errors },
  } = useForm<IFormInput>();
  const newPassword = watch("newPassword");
  const { updatePassword, isLoading, error, reset: resetMutation } = useUpdatePassword();

  useEffect(() => {
    if (isOpen) {
      resetForm();
      resetMutation();
    }
  }, [isOpen, resetForm, resetMutation]);

  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    updatePassword({
      oldPassword: data.currentPassword,
      newPassword: data.newPassword,
    })
      .then(() => {
        onClose();
      })
      .catch(() => {
        // Mutation `error` state is rendered inline below — the empty
        // catch only exists to swallow the rejection so React doesn't
        // log "unhandled promise rejection".
      });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm"
          >
            {error.message || "Failed to update password. Please try again."}
          </div>
        )}
        <TextField
          label="Current Password"
          type="password"
          {...register("currentPassword", {
            required: "Current password is required",
          })}
          error={errors.currentPassword?.message}
        />
        <TextField
          label="New Password"
          type="password"
          {...register("newPassword", {
            required: "New password is required",
            minLength: {
              value: 6,
              message: "Password must be at least 6 characters",
            },
          })}
          error={errors.newPassword?.message}
        />
        <TextField
          label="Confirm New Password"
          type="password"
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (value) =>
              value === newPassword || "Passwords do not match",
          })}
          error={errors.confirmPassword?.message}
        />
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" onClick={onClose} type="button" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <Spinner size={4} color="white" /> : "Update Password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
