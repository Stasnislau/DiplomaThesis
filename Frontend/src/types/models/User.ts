import { z } from "zod";
import { languageSchema } from "./Language";
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  surname: z.string(),
  role: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  languages: z.array(languageSchema).optional(),
});

export type User = z.infer<typeof userSchema>;
