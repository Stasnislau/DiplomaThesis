import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prismaService";

export interface CreateTaskHistoryDto {
  taskType: string;
  title: string;
  score?: number | null;
  language?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListHistoryQuery {
  taskType?: string;
  limit?: number;
  cursor?: string;
}

@Injectable()
export class TaskHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTaskHistoryDto) {
    return this.prisma.taskHistoryEntry.create({
      data: {
        userId,
        taskType: dto.taskType,
        title: dto.title,
        score: dto.score ?? null,
        language: dto.language ?? null,
        metadata: dto.metadata ?? undefined,
      },
    });
  }

  async listForUser(userId: string, query: ListHistoryQuery = {}) {
    const limit = Math.min(Math.max(query.limit ?? 30, 1), 100);
    return this.prisma.taskHistoryEntry.findMany({
      where: {
        userId,
        ...(query.taskType ? { taskType: query.taskType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(query.cursor
        ? { cursor: { id: query.cursor }, skip: 1 }
        : {}),
    });
  }

  async deleteOne(userId: string, id: string) {
    const found = await this.prisma.taskHistoryEntry.findFirst({
      where: { id, userId },
    });
    if (!found) return null;
    return this.prisma.taskHistoryEntry.delete({ where: { id } });
  }
}
