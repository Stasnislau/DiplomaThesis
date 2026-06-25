import { Test, TestingModule } from "@nestjs/testing";
import { UserErrorService } from "./userErrorService";
import { PrismaService } from "prisma/prismaService";

describe("UserErrorService", () => {
  let service: UserErrorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserErrorService,
        {
          provide: PrismaService,
          useValue: {
            language: {
              findFirst: jest.fn(),
            },
            userError: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserErrorService>(UserErrorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("record (upsert)", () => {
    const input = {
      userId: "user-123",
      languageCode: "en",
      errorText: "I has a cat",
      correction: "I have a cat",
      errorType: "Grammar",
      source: "speaking",
      context: "talking about pets",
    };
    const mockLanguage = { id: "lang-en", code: "en", name: "English" };

    it("creates a new row when no matching error exists", async () => {
      (prisma.language.findFirst as jest.Mock).mockResolvedValue(mockLanguage);
      (prisma.userError.findFirst as jest.Mock).mockResolvedValue(null);
      const created = { id: "err-1", frequency: 1, ...input };
      (prisma.userError.create as jest.Mock).mockResolvedValue(created);

      const result = await service.record(input);

      expect(prisma.userError.findFirst).toHaveBeenCalledWith({
        where: {
          userId: input.userId,
          languageId: mockLanguage.id,
          errorType: input.errorType,
          errorText: input.errorText,
        },
      });
      expect(prisma.userError.create).toHaveBeenCalledWith({
        data: {
          userId: input.userId,
          languageId: mockLanguage.id,
          errorText: input.errorText,
          correction: input.correction,
          errorType: input.errorType,
          source: input.source,
          context: input.context,
        },
      });
      expect(prisma.userError.update).not.toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it("increments frequency and refreshes lastOccurredAt when a matching error already exists", async () => {
      (prisma.language.findFirst as jest.Mock).mockResolvedValue(mockLanguage);
      const existing = {
        id: "err-1",
        userId: input.userId,
        languageId: mockLanguage.id,
        errorType: input.errorType,
        errorText: input.errorText,
        frequency: 2,
      };
      (prisma.userError.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.userError.update as jest.Mock).mockResolvedValue({
        ...existing,
        frequency: 3,
      });

      const result = await service.record(input);

      expect(prisma.userError.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: {
          frequency: 3,
          lastOccurredAt: expect.any(Date),
          correction: input.correction,
          source: input.source,
          context: input.context,
        },
      });
      expect(prisma.userError.create).not.toHaveBeenCalled();
      expect(result.frequency).toBe(3);
    });
  });

  describe("listForUser", () => {
    it("returns errors ordered by frequency then lastOccurredAt desc", async () => {
      const mockLanguage = { id: "lang-en", code: "en", name: "English" };
      (prisma.language.findFirst as jest.Mock).mockResolvedValue(mockLanguage);
      const rows = [{ id: "err-1" }, { id: "err-2" }];
      (prisma.userError.findMany as jest.Mock).mockResolvedValue(rows);

      const result = await service.listForUser("user-123", "en");

      expect(prisma.userError.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123", languageId: mockLanguage.id },
        orderBy: [{ frequency: "desc" }, { lastOccurredAt: "desc" }],
      });
      expect(result).toEqual(rows);
    });
  });
});
