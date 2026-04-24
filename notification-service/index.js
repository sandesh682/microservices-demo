const amqp = require("amqplib");

async function start() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  const exchange = "order_events";

  await channel.assertExchange(exchange, "fanout", {
    durable: false,
  });

  // Create its own queue (IMPORTANT)
  const q = await channel.assertQueue("", {
    exclusive: true,
  });

  console.log("📩 Notification Service waiting for events...");

  await channel.bindQueue(q.queue, exchange, "");

  channel.consume(
    q.queue,
    (msg) => {
      if (msg !== null) {
        const order = JSON.parse(msg.content.toString());

        console.log("📩 Notification received order:", order);

        console.log(`Sending notification for order ${order.id}`);

        // simulate notification
        setTimeout(() => {
          console.log(`Notification sent for order ${order.id}`);
        }, 500);
      }
    },
    { noAck: true },
  );
}

start();
