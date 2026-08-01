import { HttpService } from "@nestjs/axios";
import { IncomingMessage } from "http";
import { Test, TestingModule } from "@nestjs/testing";
import { of } from "rxjs";

import { GatewayService } from "./gatewayService";

describe("GatewayService (generation quota)", () => {
  let service: GatewayService;
  let httpService: any;

  const LIMIT = 60;

  const authOk = (id: string) => ({
    data: { success: true, payload: { id, email: `${id}@test`, role: "USER" } },
    status: 200,
    headers: {},
  });

  const downstreamOk = {
    data: { success: true, payload: "generated" },
    status: 200,
    headers: {},
  };

  const req = () => ({ pipe: jest.fn() }) as unknown as IncomingMessage;

  const call = (id: string, path = "writing/essay") =>
    service.handleRequest(
      "POST",
      `/api/gateway/ai/${path}`,
      { authorization: "Bearer token" },
      {},
      req(),
    );

  beforeEach(async () => {
    httpService = { post: jest.fn(), request: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get(GatewayService);
    httpService.request.mockReturnValue(of(downstreamOk));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("lets a learner through up to the hourly limit", async () => {
    httpService.post.mockReturnValue(of(authOk("quota-user-1")));

    for (let i = 0; i < LIMIT; i += 1) {
      const res = await call("quota-user-1");
      expect(res.status).toBe(200);
    }
  });

  it("refuses the call after the limit and names the wait", async () => {
    httpService.post.mockReturnValue(of(authOk("quota-user-2")));

    for (let i = 0; i < LIMIT; i += 1) {
      await call("quota-user-2");
    }

    const blocked = await call("quota-user-2");

    expect(blocked.status).toBe(429);
    expect(JSON.stringify(blocked.data)).toMatch(/minute/i);
  });

  it("keeps one learner's exhausted quota away from another learner", async () => {
    httpService.post.mockReturnValue(of(authOk("quota-user-3")));
    for (let i = 0; i < LIMIT + 1; i += 1) {
      await call("quota-user-3");
    }

    httpService.post.mockReturnValue(of(authOk("quota-user-4")));
    const other = await call("quota-user-4");

    expect(other.status).toBe(200);
  });

  it("stops counting once the hour has passed", async () => {
    httpService.post.mockReturnValue(of(authOk("quota-user-5")));
    for (let i = 0; i < LIMIT; i += 1) {
      await call("quota-user-5");
    }
    expect((await call("quota-user-5")).status).toBe(429);

    const anHourLater = Date.now() + 60 * 60 * 1000 + 1000;
    const clock = jest.spyOn(Date, "now").mockReturnValue(anHourLater);

    expect((await call("quota-user-5")).status).toBe(200);

    clock.mockRestore();
  });

  it("leaves paths outside generation uncounted", async () => {
    httpService.post.mockReturnValue(of(authOk("quota-user-6")));

    for (let i = 0; i < LIMIT + 5; i += 1) {
      const res = await call("quota-user-6", "health");
      expect(res.status).toBe(200);
    }
  });

  it("counts each generation family against the same budget", async () => {
    httpService.post.mockReturnValue(of(authOk("quota-user-7")));

    for (let i = 0; i < 30; i += 1) {
      await call("quota-user-7", "writing/essay");
    }
    for (let i = 0; i < 30; i += 1) {
      await call("quota-user-7", "speaking/analysis");
    }

    const blocked = await call("quota-user-7", "listening/task");

    expect(blocked.status).toBe(429);
  });
});
