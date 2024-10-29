import { NotFoundException } from "@nestjs/common";

export const urlMiddleware = () => ({
  catch: (exception, host) => {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    if (exception instanceof NotFoundException) {
      response.status(404).json({
        success: false,
        payload: "Not Found",
      });
    }
  },
});
