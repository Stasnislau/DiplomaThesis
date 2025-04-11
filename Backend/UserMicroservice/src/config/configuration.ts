export default () => ({
  port: process.env.PORT || 3004,
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost:5672",
    queue: process.env.RABBITMQ_QUEUE || "user_data",
  },
});
