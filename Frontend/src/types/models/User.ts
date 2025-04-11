import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  surname: z.string(),
  role: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof userSchema>;
