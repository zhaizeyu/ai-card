import { z } from "zod"

export const promptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(2, "请至少输入 2 个字符")
    .max(180, "描述请控制在 180 个字符以内"),
})

export const battleRequestSchema = z.object({
  cardId: z.string().min(1),
  opponentCardId: z.string().min(1).optional(),
}).refine((data) => data.cardId !== data.opponentCardId, {
  message: "请选择两张不同的卡牌",
  path: ["opponentCardId"],
})

export const cardListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  rarity: z.string().optional(),
  element: z.string().optional(),
})
