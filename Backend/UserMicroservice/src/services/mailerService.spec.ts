import { ConfigService } from "@nestjs/config";
import { MailerService } from "./mailerService";

const sendMailMock = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
}));

const buildConfig = (overrides: Record<string, unknown> = {}): ConfigService => {
  const values: Record<string, unknown> = {
    "mail.host": "smtp-relay.brevo.com",
    "mail.port": 587,
    "mail.user": "smtp-login@brevo.com",
    "mail.pass": "secret-key",
    "mail.from": "Easy Language <noreply@example.com>",
    ...overrides,
  };
  return {
    get: <T>(key: string): T => values[key] as T,
  } as unknown as ConfigService;
};

describe("MailerService", () => {
  beforeEach(() => {
    sendMailMock.mockReset();
  });

  it("delivers a localised English password-reset when creds are present", async () => {
    const service = new MailerService(buildConfig());
    sendMailMock.mockResolvedValue({ messageId: "id-1" });

    await service.sendPasswordReset("alice@test.com", "uuid-123", "en");

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe("alice@test.com");
    expect(call.subject).toBe("Your new password");
    expect(call.text).toContain("uuid-123");
    expect(call.html).toContain("uuid-123");
  });

  it("uses the Polish template when locale=pl", async () => {
    const service = new MailerService(buildConfig());
    sendMailMock.mockResolvedValue({ messageId: "id-2" });

    await service.sendPasswordReset("bob@test.com", "pwd-pl", "pl");

    const call = sendMailMock.mock.calls[0][0];
    expect(call.subject).toBe("Twoje nowe hasło");
    expect(call.text).toContain("Nowe hasło");
  });

  it("uses the Spanish template when locale=es", async () => {
    const service = new MailerService(buildConfig());
    sendMailMock.mockResolvedValue({ messageId: "id-3" });

    await service.sendPasswordReset("carol@test.com", "pwd-es", "es");

    const call = sendMailMock.mock.calls[0][0];
    expect(call.subject).toBe("Tu nueva contraseña");
    expect(call.text).toContain("Nueva contraseña");
  });

  it("falls back to English template for unknown locale", async () => {
    const service = new MailerService(buildConfig());
    sendMailMock.mockResolvedValue({ messageId: "id-4" });

    await service.sendPasswordReset("dana@test.com", "pwd-x", "klingon");

    const call = sendMailMock.mock.calls[0][0];
    expect(call.subject).toBe("Your new password");
  });

  it("logs and skips delivery when SMTP creds are missing (dev fallback)", async () => {
    const service = new MailerService(
      buildConfig({
        "mail.host": undefined,
        "mail.user": undefined,
        "mail.pass": undefined,
        "mail.from": undefined,
      }),
    );

    await expect(
      service.sendPasswordReset("eve@test.com", "pwd-stub", "en"),
    ).resolves.toBeUndefined();

    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("propagates SMTP errors so RabbitMQ can requeue", async () => {
    const service = new MailerService(buildConfig());
    sendMailMock.mockRejectedValue(new Error("relay refused"));

    await expect(
      service.sendPasswordReset("frank@test.com", "pwd-fail", "en"),
    ).rejects.toThrow("relay refused");
  });
});
