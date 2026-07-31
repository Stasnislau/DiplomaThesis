import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { UserErrorController } from "./userErrorController";
import { UserErrorService } from "../services/userErrorService";

/**
 * The error log is written by the AI service after it grades an answer,
 * never by the learner. That gate is the only thing standing between a
 * learner and a forged log of someone else's mistakes, so it is checked
 * from both sides here: a call without the shared key is refused, and a
 * call with it is scoped to the identity the gateway forwarded.
 */
describe("UserErrorController", () => {
  let controller: UserErrorController;
  let service: jest.Mocked<UserErrorService>;

  const INTERNAL_KEY = "test-internal-key";

  const dto = {
    languageCode: "en",
    errorText: "I has a book",
    correction: "I have a book",
    errorType: "grammar",
    source: "writing",
    context: "essay task",
  };

  const requestFrom = (
    headers: Record<string, string>,
    userId = "learner-1",
  ) =>
    ({
      headers,
      user: { id: userId, email: "learner@example.com", role: "USER" },
    }) as any;

  beforeEach(async () => {
    process.env.INTERNAL_SERVICE_KEY = INTERNAL_KEY;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserErrorController],
      providers: [
        {
          provide: UserErrorService,
          useValue: {
            record: jest.fn().mockResolvedValue({ id: "err-1" }),
            listForUser: jest.fn().mockResolvedValue([{ id: "err-1" }]),
          },
        },
      ],
    }).compile();

    controller = module.get(UserErrorController);
    service = module.get(UserErrorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("recording an error", () => {
    it("stores the entry when the caller presents the shared key", async () => {
      const res = await controller.record(
        requestFrom({ "x-internal-service-key": INTERNAL_KEY }),
        dto as any,
      );

      expect(res.success).toBe(true);
      expect(service.record).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "learner-1", errorText: dto.errorText }),
      );
    });

    it("refuses a caller with no key", async () => {
      await expect(
        controller.record(requestFrom({}), dto as any),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(service.record).not.toHaveBeenCalled();
    });

    it("refuses a caller with the wrong key", async () => {
      await expect(
        controller.record(
          requestFrom({ "x-internal-service-key": "guessed" }),
          dto as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(service.record).not.toHaveBeenCalled();
    });

    it("refuses everyone when the service has no key configured", async () => {
      delete process.env.INTERNAL_SERVICE_KEY;

      await expect(
        controller.record(
          requestFrom({ "x-internal-service-key": "anything" }),
          dto as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("logs against the forwarded identity and not against the body", async () => {
      await controller.record(
        requestFrom({ "x-internal-service-key": INTERNAL_KEY }, "learner-7"),
        { ...dto, userId: "someone-else" } as any,
      );

      expect(service.record).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "learner-7" }),
      );
    });
  });

  describe("listing errors", () => {
    it("asks only for the signed-in learner's entries", async () => {
      const res = await controller.list(requestFrom({}, "learner-3"), "pl");

      expect(res.success).toBe(true);
      expect(service.listForUser).toHaveBeenCalledWith("learner-3", "pl");
    });

    it("passes an absent language through untouched", async () => {
      await controller.list(requestFrom({}), undefined as any);

      expect(service.listForUser).toHaveBeenCalledWith("learner-1", undefined);
    });
  });
});
