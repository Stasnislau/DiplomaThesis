import { z } from "zod";

export const AiTokenSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  model: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AiToken = z.infer<typeof AiTokenSchema>;
