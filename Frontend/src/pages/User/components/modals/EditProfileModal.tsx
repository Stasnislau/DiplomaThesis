import React, { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

import Button from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import Spinner from "@/components/common/Spinner";
import TextField from "@/components/common/TextField";
import { useMe } from "@/api/hooks/useMe";
import { useTranslation } from "react-i18next";
import { useUpdateUser } from "@/api/hooks/useUpdateUser";

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
  const { t } = useTranslation();
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
        });
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("profile.editProfile")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error.message || t("profile.updateFailed")}
          </div>
        )}
        <TextField
          label={t("auth.name")}
          {...register("name", { required: t("profile.nameRequired") })}
          placeholder={t("profile.yourName")}
        />
        <TextField
          label={t("profile.surname")}
          {...register("surname", { required: t("profile.surnameRequired") })}
          placeholder={t("profile.yourSurname")}
        />
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" onClick={onClose} type="button" disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <Spinner size={4} color="white" /> : t("profile.saveChanges")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
