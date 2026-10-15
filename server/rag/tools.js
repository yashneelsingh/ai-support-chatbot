import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { pool } from "../services/postgres.js";
import { HybridRerankRetriever } from "./vectorStore.js";

// ─── Tool 1: Check Order Status ──────────────────────────────────────────────
export const checkOrderStatusTool = tool(
  async ({ orderId }) => {
    console.log(`Tool Execution: checkOrderStatus for ${orderId}`);

    const orderIdInt = parseInt(orderId, 10);
    if (isNaN(orderIdInt)) {
      return `"${orderId}" is not a valid order ID. Order IDs are numeric (e.g. 1, 42, 103).`;
    }

    try {
      // Fetch the order
      const { rows: orderRows } = await pool.query(
        `SELECT o.id, o.status, o.total, o.shipping_address, o.tracking_number,
                o.placed_at, o.processed_at, o.shipped_at, o.delivered_at, o.cancelled_at,
                u.name AS customer_name
         FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE o.id = $1`,
        [orderIdInt]
      );

      if (orderRows.length === 0) {
        return `Could not find any order with ID ${orderId}. Please check the number and try again.`;
      }

      const order = orderRows[0];

      // Fetch the line items
      const { rows: items } = await pool.query(
        `SELECT product_name, quantity, unit_price, subtotal
         FROM order_items
         WHERE order_id = $1`,
        [orderIdInt]
      );

      // Build a readable item list
      const itemList = items.length > 0
        ? items.map(i => `  • ${i.product_name} (x${i.quantity}) — $${parseFloat(i.unit_price).toFixed(2)} each`).join("\n")
        : "  (no items found)";

      // Build status-specific details
      let statusDetails = `Status: ${order.status.toUpperCase()}`;
      if (order.placed_at)     statusDetails += `\nPlaced: ${new Date(order.placed_at).toLocaleDateString()}`;
      if (order.processed_at)  statusDetails += `\nProcessed: ${new Date(order.processed_at).toLocaleDateString()}`;
      if (order.shipped_at)    statusDetails += `\nShipped: ${new Date(order.shipped_at).toLocaleDateString()}`;
      if (order.delivered_at)  statusDetails += `\nDelivered: ${new Date(order.delivered_at).toLocaleDateString()}`;
      if (order.cancelled_at)  statusDetails += `\nCancelled: ${new Date(order.cancelled_at).toLocaleDateString()}`;
      if (order.tracking_number) statusDetails += `\nTracking: ${order.tracking_number}`;

      return `Order #${order.id} for ${order.customer_name}\n${statusDetails}\nTotal: $${parseFloat(order.total).toFixed(2)}\n\nItems:\n${itemList}`;
    } catch (err) {
      console.error("check_order_status error:", err);
      return "Sorry, there was a system error looking up that order. Please try again in a moment.";
    }
  },
  {
    name: "check_order_status",
    description:
      "Use this tool to check the status of a customer's order. Provide the order ID (a number, e.g. '5', '42'). Returns full order details including status, items, tracking, and timestamps.",
    schema: z.object({
      orderId: z.string().regex(/^\d+$/, "Order ID must be numeric").describe("The numeric order ID to look up"),
    }),
  }
);

// ─── Tool 2: Initiate Refund ─────────────────────────────────────────────────
export const initiateRefundTool = tool(
  async ({ orderId, reason, confirmed }) => {
    console.log(`Tool Execution: initiateRefund for ${orderId} — reason: ${reason}, confirmed: ${confirmed}`);

    const orderIdInt = parseInt(orderId, 10);
    if (isNaN(orderIdInt)) {
      return `"${orderId}" is not a valid order ID. Order IDs are numeric.`;
    }

    try {
      // 1. Look up the order
      const { rows: orderRows } = await pool.query(
        `SELECT o.id, o.status, o.total, o.user_id
         FROM orders o
         WHERE o.id = $1`,
        [orderIdInt]
      );

      if (orderRows.length === 0) {
        return `Cannot process refund — order ${orderId} was not found.`;
      }

      const order = orderRows[0];

      // 2. Check if the order is in a refundable state
      if (order.status === "cancelled") {
        return `Order ${orderId} has already been cancelled. A refund may have already been issued. Please check with support.`;
      }
      if (order.status === "placed") {
        return `Order ${orderId} is still in "placed" status and hasn't been charged yet. You can cancel it instead of requesting a refund.`;
      }

      // 3. Check for existing pending/completed refund
      const { rows: existingRefunds } = await pool.query(
        `SELECT id, status, amount FROM refunds
         WHERE order_id = $1 AND status IN ('pending', 'approved', 'completed')`,
        [orderIdInt]
      );

      if (existingRefunds.length > 0) {
        const r = existingRefunds[0];
        return `A refund (ID #${r.id}) for order ${orderId} is already ${r.status} for $${parseFloat(r.amount).toFixed(2)}. No duplicate refund was created.`;
      }

      if (!confirmed) {
        return `Eligibility confirmed. Amount to refund: $${parseFloat(order.total).toFixed(2)}. INSTRUCTION TO AGENT: You MUST now ask the user to explicitly confirm they want a refund of $${parseFloat(order.total).toFixed(2)} for order ${orderId} due to: ${reason}. Do NOT call this tool with confirmed=true until they say yes.`;
      }

      // 4. Create the refund
      const { rows: refundRows } = await pool.query(
        `INSERT INTO refunds (order_id, user_id, amount, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING id, amount, requested_at`,
        [orderIdInt, order.user_id, order.total, reason]
      );

      const refund = refundRows[0];

      return `Refund #${refund.id} has been initiated for order ${orderId}.\nAmount: $${parseFloat(refund.amount).toFixed(2)}\nReason: ${reason}\nStatus: PENDING — it will be reviewed and processed within 3–5 business days.`;
    } catch (err) {
      console.error("initiate_refund error:", err);
      return "Sorry, there was a system error processing the refund. Please try again in a moment.";
    }
  },
  {
    name: "initiate_refund",
    description:
      "Use this tool to initiate a refund for a customer's order when they are dissatisfied or request one. Requires the order ID and a reason for the refund. You MUST call this with confirmed=false first, ask the user to confirm, and only call with confirmed=true AFTER they explicitly agree.",
    schema: z.object({
      orderId: z.string().regex(/^\d+$/, "Order ID must be numeric").describe("The numeric order ID to refund"),
      reason: z.string().describe("The reason for the refund"),
      confirmed: z.boolean().default(false).describe("Set to false initially to check eligibility. Set to true ONLY after the user explicitly confirms the refund amount."),
    }),
  }
);

// ─── Tool 3: Escalate to Human ───────────────────────────────────────────────
export const escalateToHumanTool = tool(
  async ({ issueSummary, sessionId }) => {
    console.log(`Tool Execution: escalateToHuman — ${issueSummary} (session: ${sessionId || 'unknown'})`);

    try {
      // Fetch recent conversation context from MongoDB for the admin to review
      let conversationContext = null;
      if (sessionId) {
        try {
          const Session = (await import("../models/Session.js")).default;
          const session = await Session.findOne({ sessionId });
          if (session?.messages?.length) {
            // Take the last 20 messages to keep context manageable
            const recentMessages = session.messages.slice(-20);
            conversationContext = recentMessages
              .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
              .join("\n");
          }
        } catch (ctxErr) {
          console.warn("Could not fetch conversation context:", ctxErr.message);
        }
      }

      const { rows } = await pool.query(
        `INSERT INTO tickets (session_id, summary, conversation_context, priority)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`,
        [sessionId || null, issueSummary, conversationContext, "high"]
      );

      const ticket = rows[0];

      return `ESCALATION_TRIGGERED: Support ticket #${ticket.id} has been created and a human agent has been notified. Summary: "${issueSummary}". Please ask the user to wait — someone will be with them shortly.`;
    } catch (err) {
      console.error("escalate_to_human error:", err);
      // Fallback so the agent still knows escalation was attempted
      return `ESCALATION_TRIGGERED: A human agent has been notified about: "${issueSummary}". (Note: ticket logging encountered an error, but the escalation was still triggered.) Please ask the user to wait.`;
    }
  },
  {
    name: "escalate_to_human",
    description:
      "Use this tool ONLY when you cannot solve the user's problem, or if the user explicitly asks to speak to a human or manager. Creates a support ticket with full conversation context and alerts human agents.",
    schema: z.object({
      issueSummary: z
        .string()
        .describe("A brief summary of what the user needs help with"),
      sessionId: z
        .string()
        .optional()
        .describe("The current chat session ID, if available"),
    }),
  }
);

// ─── Tool 4: Search Knowledge Base (RAG) ───────────────────────────────────────
export const searchKnowledgeBaseTool = tool(
  async ({ query }) => {
    console.log(`Tool Execution: searchKnowledgeBase for "${query}"`);
    try {
      const retriever = new HybridRerankRetriever(4);
      const docs = await retriever.getRelevantDocuments(query);
      if (docs.length === 0) {
        return "No relevant information found in the knowledge base.";
      }
      return docs.map((d, i) => `[Source ${i+1}]: ${d.pageContent}`).join("\n\n");
    } catch (err) {
      console.error("search_knowledge_base error:", err);
      return "Sorry, I encountered an error searching the knowledge base.";
    }
  },
  {
    name: "search_knowledge_base",
    description: "Use this tool to search the store's knowledge base for policies, product details, FAQs, or any general information. Provide a detailed search query.",
    schema: z.object({
      query: z.string().describe("The search query to look up in the knowledge base"),
    }),
  }
);

export const agentTools = [
  checkOrderStatusTool,
  initiateRefundTool,
  escalateToHumanTool,
  searchKnowledgeBaseTool,
];
