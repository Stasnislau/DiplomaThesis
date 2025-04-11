import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";

const prisma = new PrismaClient();

// Create a proper config with default values
const rabbitmqConfig = {
  url: process.env.RABBITMQ_URL || "amqp://localhost:5672",
  queue: process.env.RABBITMQ_QUEUE || "user_data"  // Match UserMicroservice queue name
};

// Create RabbitMQ client with explicit config values
const eventService = ClientProxyFactory.create({
  transport: Transport.RMQ,
  options: {
    urls: [rabbitmqConfig.url],
    queue: rabbitmqConfig.queue,
    queueOptions: {
      durable: false,
    },
  },
});

async function main() {
  await eventService.connect();

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: "admin@admin.com",
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin", 10);

    console.log(rabbitmqConfig.url, rabbitmqConfig.queue, "sending event")

    try {
      const admin = await prisma.user.create({
        data: {
          email: "admin@admin.com",
          role: "ADMIN",
          credentials: {
            create: {
              password: hashedPassword,
            },
          },
        },
      });

      console.log("Admin user created:", admin);

      const result = await eventService
        .emit('user.created', {
          id: admin.id,
          email: admin.email,
          name: "Admin",
          surname: "User",
          role: admin.role,
          createdAt: admin.createdAt,
        })
        .toPromise(); // Wait for acknowledgment
      
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
