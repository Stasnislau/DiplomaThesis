import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../prisma/prismaService";
import { TaskHistoryService } from "./task-history.service";

describe("TaskHistoryService", () => {
  let service: TaskHistoryService;
  let prisma: {
    taskHistoryEntry: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      taskHistoryEntry: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskHistoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TaskHistoryService);
  });

  it("creates a history row with optional score and metadata", async () => {
    prisma.taskHistoryEntry.create.mockResolvedValue({ id: "h1" });

    await service.create("u1", {
      taskType: "listening",
      title: "Airport",
      score: 0.8,
      language: "en",
      metadata: { level: "B1" },
    });

    expect(prisma.taskHistoryEntry.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        taskType: "listening",
        title: "Airport",
        score: 0.8,
        language: "en",
        metadata: { level: "B1" },
      },
    });
  });

  it("lists newest-first with a clamped limit and optional cursor", async () => {
    prisma.taskHistoryEntry.findMany.mockResolvedValue([]);

    await service.listForUser("u1", {
      taskType: "writing",
      limit: 500,
      cursor: "c1",
    });

    expect(prisma.taskHistoryEntry.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", taskType: "writing" },
      orderBy: { createdAt: "desc" },
      take: 100,
      cursor: { id: "c1" },
      skip: 1,
    });
  });

  it("returns null when deleting a missing row", async () => {
    prisma.taskHistoryEntry.findFirst.mockResolvedValue(null);
    await expect(service.deleteOne("u1", "missing")).resolves.toBeNull();
    expect(prisma.taskHistoryEntry.delete).not.toHaveBeenCalled();
  });

  it("deletes a row owned by the user", async () => {
    prisma.taskHistoryEntry.findFirst.mockResolvedValue({ id: "h1" });
    prisma.taskHistoryEntry.delete.mockResolvedValue({ id: "h1" });

    await expect(service.deleteOne("u1", "h1")).resolves.toEqual({ id: "h1" });
    expect(prisma.taskHistoryEntry.delete).toHaveBeenCalledWith({
      where: { id: "h1" },
    });
  });
});
