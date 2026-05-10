import { z } from "zod";
import { UserLanguageSchema } from "./Language";
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  surname: z.string(),
  role: z.string(),
  xp: z.number().default(0),
  streak: z.number().default(0),
  lastActivityDate: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  languages: z.array(UserLanguageSchema).optional(),
});

export type User = z.infer<typeof userSchema>;


