const amqp = require("amqplib");

async function startDLQConsumer() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  const queue = "payment_dlq";

  await channel.assertQueue(queue, { durable: false });

  console.log("🚨 DLQ Consumer listening...");

  channel.consume(
    queue,
    (msg) => {
      if (!msg) return;

      const event = JSON.parse(msg.content.toString());

      console.log("🚨 DLQ Event Received:", event);
    },
    { noAck: true },
  );
}

startDLQConsumer();
