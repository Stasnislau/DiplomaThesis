import { Test, TestingModule } from "@nestjs/testing";

import { TaskHistoryController } from "./task-history.controller";
import { TaskHistoryService } from "../services/task-history.service";

describe("TaskHistoryController", () => {
  let controller: TaskHistoryController;
  let service: jest.Mocked<TaskHistoryService>;

  const INTERNAL_KEY = "test-internal-key";

  const dto = { taskType: "writing", score: 8 } as any;

  const requestFrom = (
    headers: Record<string, string | undefined>,
    user?: { id: string },
  ) => ({ headers, user }) as any;

  beforeEach(async () => {
    process.env.INTERNAL_SERVICE_KEY = INTERNAL_KEY;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskHistoryController],
      providers: [
        {
          provide: TaskHistoryService,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: "entry-1" }),
            listForUser: jest.fn().mockResolvedValue([{ id: "entry-1" }]),
            deleteOne: jest.fn().mockResolvedValue({ id: "entry-1" }),
          },
        },
      ],
    }).compile();

    controller = module.get(TaskHistoryController);
    service = module.get(TaskHistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("creating an entry", () => {
    it("records against the signed-in learner when the gateway forwards one", async () => {
      const res = await controller.create(
        requestFrom({}, { id: "learner-1" }),
        dto,
      );

      expect(res.success).toBe(true);
      expect(service.create).toHaveBeenCalledWith("learner-1", dto);
    });

    it("records against the header identity when the AI service calls", async () => {
      await controller.create(
        requestFrom({
          "x-internal-service-key": INTERNAL_KEY,
          "x-user-id": "learner-9",
        }),
        dto,
      );

      expect(service.create).toHaveBeenCalledWith("learner-9", dto);
    });

    it("ignores the header identity when the key is wrong", async () => {
      await controller.create(
        requestFrom(
          { "x-internal-service-key": "guessed", "x-user-id": "victim" },
          { id: "learner-1" },
        ),
        dto,
      );

      expect(service.create).toHaveBeenCalledWith("learner-1", dto);
    });

    it("refuses when no route supplies an identity", async () => {
      await expect(controller.create(requestFrom({}), dto)).rejects.toThrow();

      expect(service.create).not.toHaveBeenCalled();
    });

    it("refuses an internal call that names no learner", async () => {
      await expect(
        controller.create(
          requestFrom({ "x-internal-service-key": INTERNAL_KEY }),
          dto,
        ),
      ).rejects.toThrow();
    });
  });

  describe("listing entries", () => {
    it("scopes the listing to the caller", async () => {
      const res = await controller.list(requestFrom({}, { id: "learner-2" }));

      expect(res.success).toBe(true);
      expect(service.listForUser).toHaveBeenCalledWith("learner-2", {
        taskType: undefined,
        limit: undefined,
        cursor: undefined,
      });
    });

    it("passes the filters through, with the limit as a number", async () => {
      await controller.list(
        requestFrom({}, { id: "learner-2" }),
        "speaking",
        "25",
        "cursor-1",
      );

      expect(service.listForUser).toHaveBeenCalledWith("learner-2", {
        taskType: "speaking",
        limit: 25,
        cursor: "cursor-1",
      });
    });
  });

  describe("removing an entry", () => {
    it("deletes an entry that belongs to the caller", async () => {
      const res = await controller.remove(
        requestFrom({}, { id: "learner-2" }),
        "entry-1",
      );

      expect(res.success).toBe(true);
      expect(service.deleteOne).toHaveBeenCalledWith("learner-2", "entry-1");
    });

    it("reports a miss instead of pretending the delete worked", async () => {
      service.deleteOne.mockResolvedValue(null as any);

      const res = await controller.remove(
        requestFrom({}, { id: "learner-2" }),
        "someone-elses-entry",
      );

      expect(res.success).toBe(false);
    });
  });
});
