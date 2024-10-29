import { HttpService } from "@nestjs/axios";
import { Controller, Post, Body, Logger } from "@nestjs/common";
import { firstValueFrom, lastValueFrom } from "rxjs";

@Controller("bridge")
export class BridgeController {
  constructor(private httpService: HttpService) {}
  private readonly logger = new Logger(BridgeController.name);

  @Post("askAi")
  async askAi(@Body() data: any) {
    const response = await firstValueFrom(
      this.httpService.post("http://127.0.0.1:3003/api/bridge/askAi", data)
    );
    return response.data;
  }

  @Post("createtask")
  async createTask(@Body() data: any) {
    const response = await lastValueFrom(
      this.httpService.post("http://127.0.0.1:3003/api/bridge/createtask", data)
    );
    return response.data;
  }

  @Post("explainanswer")
  async explainAnswer(@Body() data: any) {
    const response = await firstValueFrom(
      this.httpService.post(
        "http://127.0.0.1:3003/api/bridge/explainanswer",
        data
      )
    );
    return response.data;
  }
}
