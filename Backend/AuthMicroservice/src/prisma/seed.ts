import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import {
  ClientProxyFactory,
  Transport,
} from "@nestjs/microservices";

const prisma = new PrismaClient();

// Create RabbitMQ client
const eventService = ClientProxyFactory.create({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || "amqp://localhost:5672"],
    queue: process.env.RABBITMQ_QUEUE || "auth-queue",
    queueOptions: {
      durable: false,
    },
  },
});

async function main() {
  await eventService.connect();

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: "admin@yourdomain.com",
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("adminPassword123", 10);

    try {
      const admin = await prisma.user.create({
        data: {
          email: "admin@admin.com",
          name: "Admin",
          surname: "User",
          role: "ADMIN",
          credentials: {
            create: {
              password: hashedPassword,
            },
          },
        },
      });

      console.log("Admin user created:", admin);

      await eventService.emit("user.created", {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        surname: admin.surname,
        role: admin.role,
      });

      console.log("Admin user event emitted successfully");
    } catch (error) {
      console.error("Error creating admin or emitting event:", error);
      throw error;
    }
  } else {
    console.log("Admin user already exists");
  }
}

main()
  .catch((e) => {
    console.error("Error seeding admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Clean up connections
    await Promise.all([prisma.$disconnect(), eventService.close()]);
  });
