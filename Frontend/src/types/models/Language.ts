import { z } from "zod";
import { LanguageLevel } from "./LanguageLevel";

export const UserLanguageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  languageId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  level: z.nativeEnum(LanguageLevel),
  isStarted: z.boolean(),
  isNative: z.boolean(),
});

export type UserLanguage = z.infer<typeof UserLanguageSchema>;
