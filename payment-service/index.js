const amqp = require("amqplib");
const { randomUUID } = require("crypto");

const EXCHANGE = "order_events";
const RETRY_QUEUE = "payment_retry_queue";
const DLQ_EXCHANGE = "dlq_exchange";
const DLQ_QUEUE = "payment_dlq";

const MAX_RETRIES = 3;

// Better than Set → track status
const orderStatus = new Map();

let channel;

// 🔌 Connect to RabbitMQ
async function connect() {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();

  // ✅ Control concurrency
  channel.prefetch(1);
}

// ⚙️ Setup exchange + queues
async function setup() {
  await channel.assertExchange(EXCHANGE, "fanout", { durable: true });

  await channel.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000,
      "x-dead-letter-exchange": EXCHANGE,
    },
  });

  // 🔥 FIX 1: DLQ setup moved INSIDE setup()
  await channel.assertExchange(DLQ_EXCHANGE, "fanout", { durable: true });
  await channel.assertQueue(DLQ_QUEUE, { durable: true });
  await channel.bindQueue(DLQ_QUEUE, DLQ_EXCHANGE, "");
}

// 📥 Start consumer
async function startConsumer() {
  const q = await channel.assertQueue("", { exclusive: true });

  await channel.bindQueue(q.queue, EXCHANGE, "");

  console.log("💳 Payment Service waiting for events...");

  channel.consume(q.queue, handleMessage, { noAck: false });
}

// 📨 Handle incoming message
function handleMessage(msg) {
  if (!msg) return;

  try {
    const event = JSON.parse(msg.content.toString());

    if (event.type !== "OrderCreated") {
      channel.ack(msg);
      return;
    }

    const orderId = event.data.id;
    const retryCount = event.retryCount || 0;

    console.log(`[Order ${orderId}] Received | Retry: ${retryCount}`);

    // 🔥 FIX 2: Better idempotency (SUCCESS + FAILED)
    const status = orderStatus.get(orderId);
    if (status === "SUCCESS" || status === "FAILED") {
      console.log(`⚠️ Duplicate ignored: ${orderId}`);
      channel.ack(msg);
      return;
    }

    processPayment(event, msg, retryCount);
  } catch (err) {
    console.error("❌ Error processing message:", err);

    // 🔥 FIX 3: Explicit nack instead of silent retry
    channel.nack(msg, false, true);
  }
}

// 💳 Business logic
function processPayment(event, msg, retryCount) {
  const order = event.data;

  console.log(`💳 Processing order ${order.id}, retry: ${retryCount}`);

  const isSuccess = Math.random() > 0.7;

  if (isSuccess) {
    handleSuccess(order, msg);
  } else {
    handleFailure(event, order, msg, retryCount);
  }
}

// ✅ Success handler
function handleSuccess(order, msg) {
  console.log("✅ Payment SUCCESS:", order.id);

  orderStatus.set(order.id, "SUCCESS");

  publishEvent({
    eventId: randomUUID(),
    type: "PaymentSuccess",
    data: { orderId: order.id },
  });

  channel.ack(msg);
}

// ❌ Failure handler
function handleFailure(event, order, msg, retryCount) {
  console.log("❌ Payment FAILED:", order.id);

  try {
    if (retryCount < MAX_RETRIES) {
      retryEvent(event, retryCount);
    } else {
      publishFailure(event, order); // 🔥 FIX 4: correct params
    }

    channel.ack(msg);
  } catch (err) {
    console.error("❌ Retry failed, not acking:", err);
    channel.nack(msg, false, true);
  }
}

// 🔁 Retry logic
function retryEvent(event, retryCount) {
  console.log(`🔁 Sending to retry queue (attempt ${retryCount + 1})`);

  channel.sendToQueue(
    RETRY_QUEUE,
    Buffer.from(
      JSON.stringify({
        ...event,
        // 🔥 FIX 5: DO NOT change eventId (important for traceability)
        retryCount: retryCount + 1,
      }),
    ),
    { persistent: true },
  );
}

// 🚨 Final failure
function publishFailure(event, order) {
  console.log("🚨 Max retries reached. Sending to DLQ:", order.id);

  // 🔥 FIX 6: mark FAILED for idempotency
  orderStatus.set(order.id, "FAILED");

  const failedEvent = {
    eventId: randomUUID(),
    type: "PaymentFailed",
    data: {
      orderId: order.id,
      originalEventId: event.eventId,
      retryCount: event.retryCount,
    },
  };

  // 🔥 FIX 7: persistent DLQ message
  channel.publish(DLQ_EXCHANGE, "", Buffer.from(JSON.stringify(failedEvent)), {
    persistent: true,
  });
}

// 📤 Publish helper
function publishEvent(event) {
  channel.publish(EXCHANGE, "", Buffer.from(JSON.stringify(event)), {
    persistent: true,
  });
}

// 🚀 Start app
async function start() {
  await connect();
  await setup();
  await startConsumer();
}

start();
