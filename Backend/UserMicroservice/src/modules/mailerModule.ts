import { Module } from "@nestjs/common";
import { MailerService } from "../services/mailerService";

@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
