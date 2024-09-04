import * as yup from 'yup';

export const registerSchema = yup.object().shape({
    email: yup.string().email().required(),
    password: yup.string().required(),
    name: yup.string().required(),
    surname: yup.string().required(),
});

export type RegisterRequest = yup.InferType<typeof registerSchema>;