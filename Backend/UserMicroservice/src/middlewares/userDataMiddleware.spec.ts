import { NextFunction, Response } from "express";

import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { UserDataMiddleware } from "./userDataMiddleware";

describe("UserDataMiddleware", () => {
  it("copies gateway identity headers onto req.user", () => {
    const middleware = new UserDataMiddleware();
    const req = {
      headers: {
        "x-user-id": "u-1",
        "x-user-email": "a@b.com",
        "x-user-role": "ADMIN",
      },
    } as unknown as AuthenticatedRequest;
    const next = jest.fn() as NextFunction;

    middleware.use(req, {} as Response, next);

    expect(req.user).toEqual({
      id: "u-1",
      email: "a@b.com",
      role: "ADMIN",
    });
    expect(next).toHaveBeenCalled();
  });
});
