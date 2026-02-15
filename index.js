const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// 簡單防重：記錄近期已處理過的 order id（存在記憶體）
const processedOrders = new Set();

app.post("/shopify-orders", async (req, res) => {
  const order = req.body;

  if (!order || !order.id) {
    return res.sendStatus(400);
  }

  // 如果這個 order.id 已經處理過，就直接回 200，不再發 Slack
  if (processedOrders.has(order.id)) {
    return res.sendStatus(200);
  }

  // 新訂單：先記錄這個 id
  processedOrders.add(order.id);

  const orderNumber = order.name || `#${order.id}`;
  const totalPrice = order.total_price;
  const currency = order.currency;
  const customerName =
    order.customer && order.customer.first_name
      ? `${order.customer.first_name} ${order.customer.last_name || ""}`.trim()
      : "Guest";

  const lineItems = (order.line_items || [])
    .map((item) => `${item.quantity} x ${item.title}`)
    .join(", ");

  const text = `🛒 新訂單：${orderNumber}
👤 客人：${customerName}
💰 金額：${totalPrice} ${currency}
📦 商品：${lineItems}`;

  try {
    await axios.post(
      SLACK_WEBHOOK_URL,
      { text },
      { headers: { "Content-Type": "application/json" } }
    );
    res.sendStatus(200);
  } catch (error) {
    console.error("Error sending to Slack:", error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
