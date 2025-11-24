import { z } from "zod";

export const AiTokenSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  aiProviderId: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  aiProvider: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
});

export type AiToken = z.infer<typeof AiTokenSchema>;
