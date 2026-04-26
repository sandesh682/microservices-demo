const amqp = require("amqplib");
const { randomUUID } = require("crypto");

let channel;

async function connectQueue() {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();
  const exchange = "order_events";
  await channel.assertExchange(exchange, "fanout", { durable: false });
  console.log("Connected to RabbitMQ");
}

function publishOrderCreated(order) {
  channel.publish(
    "order_events",
    "",
    Buffer.from(
      JSON.stringify({
        eventId: randomUUID(),
        type: "OrderCreated",
        data: order,
        retryCount: 0,
      }),
    ),
  );
}

module.exports = { connectQueue, publishOrderCreated };
