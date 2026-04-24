const amqp = require("amqplib");

let channel;

async function connectQueue() {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();
  const exchange = "order_events";
  await channel.assertExchange(exchange, "fanout", { durable: false });
  console.log("Connected to RabbitMQ");
}

function publishOrderCreated(order) {
  const exchange = "order_events";
  channel.publish(exchange, "", Buffer.from(JSON.stringify(order)));
  console.log("Event Published: OrderCreated", order);
}

module.exports = { connectQueue, publishOrderCreated };
