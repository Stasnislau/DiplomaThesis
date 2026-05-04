import { Controller, Get } from "@nestjs/common";

/**
 * Plain liveness probe. Always returns 200 once Nest finishes
 * booting, so docker-compose can use this for `service_healthy`
 * gating instead of `service_started` which races on slow boots.
 */
@Controller("health")
export class HealthController {
  @Get()
  health() {
    return { status: "ok", service: "auth" };
  }
}
