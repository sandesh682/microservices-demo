const amqp = require("amqplib");

async function start() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  const exchange = "order_events";

  // Create exchange (safe if already exists)
  await channel.assertExchange(exchange, "fanout", {
    durable: false,
  });

  // Create a queue (auto-generated name)
  const q = await channel.assertQueue("", {
    exclusive: true,
  });

  console.log("Waiting for order events...");

  // Bind queue to exchange
  await channel.bindQueue(q.queue, exchange, "");

  // Consume messages
  channel.consume(
    q.queue,
    (msg) => {
      if (msg !== null) {
        const order = JSON.parse(msg.content.toString());

        console.log("💳 Payment Service received order:", order);

        console.log("Processing payment for order:", order.id);

        // simulate processing
        setTimeout(() => {
          console.log("Payment completed for order:", order.id);
        }, 1000);
      }
    },
    { noAck: true },
  );
}

start();
