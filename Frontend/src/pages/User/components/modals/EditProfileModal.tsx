import React, { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import Button from "@/components/common/Button";
import TextField from "@/components/common/TextField";
import { useMe } from "@/api/hooks/useMe";
import { useUpdateUser } from "@/api/hooks/useUpdateUser";
import Spinner from "@/components/common/Spinner";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IFormInput {
  name: string;
  surname: string;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { me } = useMe();
  const { updateUser, isLoading, error, reset: resetMutation } = useUpdateUser();
  const { register, handleSubmit, reset: resetForm } = useForm<IFormInput>({
    defaultValues: {
      name: me?.name || "",
      surname: me?.surname || "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      resetForm({
        name: me?.name || "",
        surname: me?.surname || "",
      });
      resetMutation();
    }
  }, [isOpen, me, resetForm, resetMutation]);

  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    if (me?.name !== data.name || me?.surname !== data.surname) {
      updateUser({ name: data.name, surname: data.surname })
        .then(() => {
          onClose();
        })
        .catch(() => {
          // Error handled by mutation state
        });
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error.message || "Failed to update profile."}
          </div>
        )}
        <TextField
          label="Name"
          {...register("name", { required: "Name is required" })}
          placeholder="Your name"
        />
        <TextField
          label="Surname"
          {...register("surname", { required: "Surname is required" })}
          placeholder="Your surname"
        />
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" onClick={onClose} type="button" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <Spinner size={4} color="white" /> : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
