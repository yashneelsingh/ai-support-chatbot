import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "D:/Projects/ai-support-chatbot";
const SKILL_DIR = "C:/Users/Yashneel Singh/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations";
const TMP_DIR = path.join(workspaceDir, ".codex-build", "draft");
const FINAL_PPTX = path.join(workspaceDir, "output", "AI_Support_Chatbot_Project_Presentation_Final.pptx");
const RUNTIME_PYTHON = "C:/Users/Yashneel Singh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href);

await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });

const W = 1280;
const H = 720;
const C = {
  red: "#C00000",
  ink: "#14213D",
  muted: "#5C667A",
  pale: "#F4F6FA",
  line: "#DCE2EA",
  blue: "#2F6BFF",
  green: "#00A67E",
  amber: "#F59E0B",
  purple: "#7457E8",
  white: "#FFFFFF",
  dark: "#0F172A",
};
const BODY = "Arial";
const HEAD = "Times New Roman";

const deck = Presentation.create({ slideSize: { width: W, height: H } });

function box(slide, x, y, w, h, fill = C.pale, radius = "roundRect", line = C.line, lineWidth = 1) {
  return slide.shapes.add({
    geometry: radius,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { fill: line, width: lineWidth },
  });
}

function text(slide, value, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: opts.font ?? BODY,
    fontSize: opts.size ?? 24,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    autoFit: opts.autoFit ?? "none",
    wrap: "square",
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
    lineSpacing: opts.lineSpacing,
  };
  return shape;
}

function header(slide, title, number) {
  slide.background.fill = C.white;
  const bar = box(slide, 237, 23, 989, 69, C.red, "rect", C.red, 0);
  bar.text = title;
  bar.text.style = {
    typeface: HEAD,
    fontSize: 28,
    bold: true,
    color: C.white,
    alignment: "center",
    verticalAlignment: "middle",
    autoFit: "shrinkText",
    insets: { left: 14, right: 14, top: 0, bottom: 0 },
  };
  text(slide, String(number).padStart(2, "0"), 54, 37, 110, 34, { size: 18, bold: true, color: C.red });
  const line = slide.shapes.add({ geometry: "line", position: { left: 54, top: 679, width: 1172, height: 0 }, fill: "none", line: { fill: C.line, width: 1 } });
  text(slide, "AI Customer Support Chatbot", 54, 689, 360, 18, { size: 12, color: C.muted });
  text(slide, String(number), 1160, 689, 66, 18, { size: 12, color: C.muted, align: "right" });
  return line;
}

function label(slide, value, x, y, w, color = C.red) {
  text(slide, value.toUpperCase(), x, y, w, 24, { size: 14, bold: true, color });
}

function bulletList(slide, items, x, y, w, h, opts = {}) {
  const shape = text(slide, "", x, y, w, h, { size: opts.size ?? 20, color: opts.color ?? C.ink, lineSpacing: 1.08 });
  shape.text.set(items.map((item) => ({
    bulletCharacter: "•",
    marginLeft: 20 * 12700,
    indent: -11 * 12700,
    spaceAfter: (opts.spaceAfterPt ?? 8) * 100,
    runs: typeof item === "string" ? [item] : item,
  })));
  shape.text.style = {
    typeface: BODY,
    fontSize: opts.size ?? 20,
    color: opts.color ?? C.ink,
    autoFit: "shrinkText",
    insets: { left: 0, right: 4, top: 0, bottom: 0 },
  };
  return shape;
}

function stat(slide, number, caption, x, y, color) {
  text(slide, number, x, y, 210, 68, { size: 50, bold: true, color });
  text(slide, caption, x, y + 67, 210, 48, { size: 18, color: C.muted });
}

function note(slide, lines) {
  slide.speakerNotes.textFrame.setText(lines.join("\n"));
}

// 1. Cover
{
  const s = deck.slides.add();
  s.background.fill = C.white;
  const bar = box(s, 237, 23, 989, 69, C.red, "rect", C.red, 0);
  bar.text = "Industrial Training Presentation";
  bar.text.style = { typeface: HEAD, fontSize: 28, bold: true, color: C.white, alignment: "center", verticalAlignment: "middle", autoFit: "none" };
  label(s, "MERN + LangChain + Gemini", 58, 147, 480, C.red);
  text(s, "AI Customer\nSupport Chatbot", 58, 182, 515, 190, { size: 54, bold: true, color: C.ink, lineSpacing: 0.92 });
  text(s, "A RAG-powered support platform that answers policy questions, performs account actions, and hands complex cases to human agents.", 58, 394, 505, 116, { size: 24, color: C.muted, lineSpacing: 1.08 });
  const img = await fs.readFile(path.join(workspaceDir, ".codex-build", "assets", "landing-settled.png"));
  s.images.add({ blob: new Uint8Array(img), contentType: "image/png", alt: "Helix support chatbot landing page", fit: "cover", geometry: "roundRect", borderRadius: 18, position: { left: 615, top: 139, width: 590, height: 332 } });
  const rule = s.shapes.add({ geometry: "line", position: { left: 58, top: 595, width: 1147, height: 0 }, fill: "none", line: { fill: C.line, width: 1 } });
  text(s, "Project presentation", 58, 617, 260, 28, { size: 17, bold: true, color: C.ink });
  text(s, "Source: working codebase and verified unit tests", 820, 617, 385, 28, { size: 15, color: C.muted, align: "right" });
  note(s, ["Heading style reference: Industrial Training Presentation Template [Autosaved].pptx.", "Project sources: README.md and client/server source files."]);
}

// 2. Overview
{
  const s = deck.slides.add(); header(s, "Project Overview", 2);
  label(s, "The problem", 62, 132, 480);
  text(s, "Support teams repeat the same policy answers while order actions and difficult conversations still require secure access to business data.", 62, 166, 520, 120, { size: 26, bold: true, color: C.ink, lineSpacing: 1.04 });
  text(s, "This project combines grounded answers with controlled tool use so one conversation can move from information to action and, when needed, to a human agent.", 62, 315, 520, 112, { size: 22, color: C.muted, lineSpacing: 1.08 });
  stat(s, "4", "purpose-built agent tools", 665, 158, C.blue);
  stat(s, "14", "documented API endpoints", 937, 158, C.green);
  stat(s, "2", "databases with distinct roles", 665, 343, C.purple);
  stat(s, "1", "live human handoff channel", 937, 343, C.amber);
  text(s, "Scope", 665, 538, 110, 30, { size: 18, bold: true, color: C.red });
  text(s, "Customer chat, knowledge ingestion, authentication, refunds, tickets, analytics, and audit trails.", 770, 538, 400, 60, { size: 18, color: C.ink });
  note(s, ["Source: README.md API and Agent Tools tables.", "Counts are derived from the documented routes and tool exports."]);
}

// 3. Use cases
{
  const s = deck.slides.add(); header(s, "Core Support Use Cases", 3);
  text(s, "One conversation supports both informational questions and account-specific actions.", 62, 119, 1050, 42, { size: 22, color: C.muted });
  const data = [
    ["1", "Policy questions", "Hybrid retrieval returns the most relevant knowledge-base chunks.", C.blue],
    ["2", "Order status", "The agent queries PostgreSQL for items, tracking, and status timestamps.", C.green],
    ["3", "Refund request", "Eligibility comes first. The system creates a refund only after explicit confirmation.", C.amber],
    ["4", "Human escalation", "A high-priority ticket carries recent conversation context to the admin workspace.", C.purple],
  ];
  let x = 62;
  const cards = [];
  for (const [n, t, d, color] of data) {
    const card = box(s, x, 213, 263, 314, C.white, "roundRect", C.line, 1.5);
    cards.push(card);
    const circle = box(s, x + 18, 234, 48, 48, color, "ellipse", color, 0);
    circle.text = n;
    circle.text.style = { typeface: BODY, fontSize: 18, bold: true, color: C.white, alignment: "center", verticalAlignment: "middle", autoFit: "none" };
    text(s, t, x + 18, 309, 225, 58, { size: 24, bold: true, color: C.ink });
    text(s, d, x + 18, 384, 225, 112, { size: 18, color: C.muted, lineSpacing: 1.08 });
    x += 292;
  }
  for (let i = 0; i < cards.length - 1; i++) {
    s.shapes.connect(cards[i], cards[i + 1], { kind: "straight", fromSide: "right", toSide: "left", line: { fill: "#A7B1C2", width: 2 }, tail: { type: "arrow", width: "sm", length: "sm" } });
  }
  text(s, "The same session ID links the chat, tool calls, and escalation context.", 62, 574, 1150, 36, { size: 20, bold: true, color: C.ink, align: "center" });
  note(s, ["Source: server/rag/tools.js, server/rag/agent.js, and README.md."]);
}

// 4. Stack
{
  const s = deck.slides.add(); header(s, "Technology Stack", 4);
  const layers = [
    ["Experience", "React 19, Vite, Tailwind CSS, TanStack Router", C.blue],
    ["Application", "Node.js, Express, Socket.io, LangChain", C.green],
    ["Intelligence", "Gemini chat model and 768-dimensional embeddings", C.purple],
    ["Data", "PostgreSQL, MongoDB Atlas Vector Search, Cloudinary", C.amber],
    ["Protection", "JWT, refresh tokens, Helmet, rate limiting, PII masking", C.red],
  ];
  let y = 124;
  for (const [name, details, color] of layers) {
    box(s, 75, y, 1125, 83, C.white, "roundRect", C.line, 1);
    box(s, 75, y, 20, 83, color, "rect", color, 0);
    text(s, name, 124, y + 22, 215, 40, { size: 23, bold: true, color });
    text(s, details, 350, y + 22, 808, 40, { size: 21, color: C.ink });
    y += 99;
  }
  text(s, "The stack separates interface, orchestration, retrieval, business data, and operational controls.", 75, 629, 1125, 30, { size: 18, color: C.muted, align: "center" });
  note(s, ["Source: README.md Stack section and package manifests."]);
}

// 5. Architecture
{
  const s = deck.slides.add(); header(s, "System Architecture", 5);
  const client = box(s, 70, 139, 230, 120, "#EDF3FF", "roundRect", "#C9D8FF", 1.5);
  text(s, "Client", 91, 161, 188, 32, { size: 24, bold: true, color: C.blue, align: "center" });
  text(s, "Chat UI\nAdmin workspace", 91, 204, 188, 46, { size: 18, color: C.ink, align: "center" });
  const api = box(s, 382, 139, 230, 120, "#ECFBF6", "roundRect", "#BDEBDB", 1.5);
  text(s, "API layer", 403, 161, 188, 32, { size: 24, bold: true, color: C.green, align: "center" });
  text(s, "REST routes\nSocket.io gateway", 403, 204, 188, 46, { size: 18, color: C.ink, align: "center" });
  const agent = box(s, 694, 139, 230, 120, "#F2EFFF", "roundRect", "#D7CEF8", 1.5);
  text(s, "Agent loop", 715, 161, 188, 32, { size: 24, bold: true, color: C.purple, align: "center" });
  text(s, "Gemini model\nTool execution", 715, 204, 188, 46, { size: 18, color: C.ink, align: "center" });
  const answer = box(s, 1006, 139, 200, 120, "#FFF7E8", "roundRect", "#FAD99D", 1.5);
  text(s, "Response", 1024, 161, 164, 32, { size: 24, bold: true, color: C.amber, align: "center" });
  text(s, "Answer or\nhandoff", 1024, 204, 164, 46, { size: 18, color: C.ink, align: "center" });
  for (const [a, b] of [[client, api], [api, agent], [agent, answer]]) s.shapes.connect(a, b, { kind: "straight", fromSide: "right", toSide: "left", line: { fill: "#7D8799", width: 2 }, tail: { type: "arrow", width: "med", length: "med" } });
  label(s, "Connected services", 70, 322, 300);
  const services = [
    ["PostgreSQL", "Users, orders, refunds, tickets", C.green],
    ["MongoDB Atlas", "Sessions, document chunks, vectors", C.blue],
    ["Cloudinary", "Uploaded knowledge documents", C.amber],
    ["Audit log", "PII-masked tool events", C.red],
  ];
  let sx = 70;
  for (const [name, desc, color] of services) {
    box(s, sx, 372, 263, 166, C.white, "roundRect", C.line, 1);
    box(s, sx, 372, 263, 12, color, "rect", color, 0);
    text(s, name, sx + 18, 407, 226, 31, { size: 21, bold: true, color });
    text(s, desc, sx + 18, 457, 226, 54, { size: 17, color: C.muted });
    s.shapes.connect(agent, s.shapes.items.at(-3), { kind: "elbow", fromSide: "bottom", toSide: "top", line: { fill: "#B4BDCA", width: 1.5 } });
    sx += 293;
  }
  note(s, ["Source: README.md architecture diagram and server implementation."]);
}

// 6. RAG
{
  const s = deck.slides.add(); header(s, "Hybrid RAG Pipeline", 6);
  text(s, "Semantic retrieval and exact-term matching run in parallel before rank fusion and reranking.", 62, 119, 1120, 42, { size: 22, color: C.muted });
  const q = box(s, 61, 235, 170, 112, "#EDF3FF", "roundRect", "#C9D8FF", 1.5);
  text(s, "User query", 81, 267, 130, 40, { size: 23, bold: true, color: C.blue, align: "center" });
  const vector = box(s, 326, 168, 215, 112, "#F2EFFF", "roundRect", "#D7CEF8", 1.5);
  text(s, "Vector search", 347, 190, 173, 32, { size: 22, bold: true, color: C.purple, align: "center" });
  text(s, "Semantic similarity", 347, 233, 173, 28, { size: 17, color: C.muted, align: "center" });
  const keyword = box(s, 326, 330, 215, 112, "#FFF7E8", "roundRect", "#FAD99D", 1.5);
  text(s, "Keyword search", 347, 352, 173, 32, { size: 22, bold: true, color: C.amber, align: "center" });
  text(s, "Exact terms", 347, 395, 173, 28, { size: 17, color: C.muted, align: "center" });
  const fuse = box(s, 642, 235, 210, 112, "#ECFBF6", "roundRect", "#BDEBDB", 1.5);
  text(s, "RRF fusion", 663, 258, 168, 32, { size: 23, bold: true, color: C.green, align: "center" });
  text(s, "Merge ranked lists", 663, 301, 168, 28, { size: 17, color: C.muted, align: "center" });
  const rerank = box(s, 952, 235, 250, 112, "#FFF1F1", "roundRect", "#F0C3C3", 1.5);
  text(s, "Term-overlap reranker", 969, 252, 216, 60, { size: 22, bold: true, color: C.red, align: "center", valign: "middle" });
  text(s, "Top 4 chunks", 969, 314, 216, 24, { size: 17, color: C.muted, align: "center" });
  for (const target of [vector, keyword]) s.shapes.connect(q, target, { kind: "elbow", fromSide: "right", toSide: "left", line: { fill: "#8590A2", width: 2 }, tail: { type: "arrow", width: "sm", length: "sm" } });
  for (const source of [vector, keyword]) s.shapes.connect(source, fuse, { kind: "elbow", fromSide: "right", toSide: "left", line: { fill: "#8590A2", width: 2 }, tail: { type: "arrow", width: "sm", length: "sm" } });
  s.shapes.connect(fuse, rerank, { kind: "straight", fromSide: "right", toSide: "left", line: { fill: "#8590A2", width: 2 }, tail: { type: "arrow", width: "sm", length: "sm" } });
  text(s, "Why hybrid retrieval matters", 62, 507, 300, 30, { size: 20, bold: true, color: C.ink });
  text(s, "Vector search handles paraphrases. Keyword search protects exact matches such as order IDs, SKUs, and product names.", 62, 549, 1125, 60, { size: 20, color: C.muted, align: "center" });
  note(s, ["Source: server/rag/vectorStore.js.", "The implementation retrieves two times the target candidate count, applies RRF, then returns the top four reranked chunks."]);
}

// 7. Agent tools
{
  const s = deck.slides.add(); header(s, "Agent Tools and Workflow", 7);
  const tools = [
    ["check_order_status", "Reads order items, tracking, and lifecycle timestamps.", C.blue],
    ["initiate_refund", "Checks eligibility, requests confirmation, then creates a refund.", C.amber],
    ["search_knowledge_base", "Returns grounded context from hybrid retrieval.", C.green],
    ["escalate_to_human", "Creates a ticket with recent conversation context.", C.purple],
  ];
  let y = 135;
  for (const [name, desc, color] of tools) {
    box(s, 62, y, 535, 105, C.white, "roundRect", C.line, 1);
    box(s, 62, y, 12, 105, color, "rect", color, 0);
    text(s, name, 91, y + 17, 470, 30, { font: "Consolas", size: 19, bold: true, color });
    text(s, desc, 91, y + 55, 470, 40, { size: 17, color: C.muted });
    y += 119;
  }
  label(s, "Execution loop", 681, 135, 460, C.red);
  const steps = ["Build system prompt and session context", "Ask Gemini for a response or tool call", "Execute the selected tool and audit the event", "Return the final answer within six tool rounds"];
  let sy = 181;
  const stepShapes = [];
  for (let i = 0; i < steps.length; i++) {
    const st = box(s, 681, sy, 481, 78, i === 3 ? "#FFF1F1" : C.pale, "roundRect", i === 3 ? "#E6AAAA" : C.line, 1);
    stepShapes.push(st);
    const n = box(s, 697, sy + 17, 42, 42, i === 3 ? C.red : C.dark, "ellipse", i === 3 ? C.red : C.dark, 0);
    n.text = String(i + 1);
    n.text.style = { typeface: BODY, fontSize: 17, bold: true, color: C.white, alignment: "center", verticalAlignment: "middle", autoFit: "none" };
    text(s, steps[i], 758, sy + 18, 382, 42, { size: 18, color: C.ink, valign: "middle" });
    sy += 96;
  }
  for (let i = 0; i < stepShapes.length - 1; i++) s.shapes.connect(stepShapes[i], stepShapes[i + 1], { kind: "straight", fromSide: "bottom", toSide: "top", line: { fill: "#AAB3C1", width: 1.5 }, tail: { type: "arrow", width: "sm", length: "sm" } });
  note(s, ["Source: server/rag/agent.js and server/rag/tools.js."]);
}

// 8. Safeguards
{
  const s = deck.slides.add(); header(s, "Security and Guardrails", 8);
  text(s, "6", 71, 141, 180, 100, { size: 78, bold: true, color: C.red });
  text(s, "layers of operational protection", 71, 238, 245, 75, { size: 24, bold: true, color: C.ink });
  text(s, "The controls protect access, limit abuse, constrain tool use, and reduce sensitive data exposure in logs.", 71, 339, 265, 114, { size: 20, color: C.muted, lineSpacing: 1.08 });
  const items = [
    ["Authentication", "Short-lived JWT access tokens and refresh-token rotation"],
    ["Authorization", "Admin-only ingestion, analytics, and ticket routes"],
    ["Rate limiting", "Separate limits for chat, authentication, and other endpoints"],
    ["Agent scope", "System prompt rules for domain limits and prompt-injection attempts"],
    ["Safe refunds", "Two-step confirmation plus duplicate-refund prevention"],
    ["Audit privacy", "Email, phone, card, and address patterns masked before logging"],
  ];
  let y = 130;
  for (let i = 0; i < items.length; i++) {
    const [title, desc] = items[i];
    const yy = y + (i % 3) * 151;
    const xx = i < 3 ? 394 : 813;
    box(s, xx, yy, 365, 126, C.white, "roundRect", C.line, 1);
    text(s, String(i + 1).padStart(2, "0"), xx + 17, yy + 17, 42, 25, { size: 15, bold: true, color: C.red });
    text(s, title, xx + 70, yy + 15, 270, 29, { size: 20, bold: true, color: C.ink });
    text(s, desc, xx + 17, yy + 57, 330, 55, { size: 16, color: C.muted });
  }
  note(s, ["Source: server/middleware/auth.js, rateLimit.js, auditLogger.js, and server/rag/agent.js."]);
}

// 9. Data and APIs
{
  const s = deck.slides.add(); header(s, "Data and API Design", 9);
  label(s, "Storage responsibilities", 62, 127, 480);
  box(s, 62, 168, 530, 186, "#ECFBF6", "roundRect", "#BDEBDB", 1.5);
  text(s, "PostgreSQL", 89, 194, 220, 35, { size: 26, bold: true, color: C.green });
  text(s, "Transactional records", 347, 199, 210, 26, { size: 17, color: C.muted, align: "right" });
  bulletList(s, ["Users and refresh tokens", "Orders and order items", "Refunds, tickets, and feedback"], 89, 247, 450, 93, { size: 18, spaceAfterPt: 5 });
  box(s, 650, 168, 530, 186, "#EDF3FF", "roundRect", "#C9D8FF", 1.5);
  text(s, "MongoDB Atlas", 677, 194, 250, 35, { size: 26, bold: true, color: C.blue });
  text(s, "Conversation and retrieval data", 924, 199, 229, 26, { size: 17, color: C.muted, align: "right" });
  bulletList(s, ["Chat sessions and messages", "Embedded document chunks", "Vector and text-search indexes"], 677, 247, 450, 93, { size: 18, spaceAfterPt: 5 });
  label(s, "API surface", 62, 410, 480);
  const groups = [
    ["Authentication", "4 routes", C.red],
    ["Chat and feedback", "3 routes", C.blue],
    ["Knowledge ingestion", "3 routes", C.purple],
    ["Analytics and tickets", "4 routes", C.green],
  ];
  let x = 62;
  for (const [name, count, color] of groups) {
    box(s, x, 454, 263, 112, C.white, "roundRect", C.line, 1);
    text(s, count, x + 19, 474, 225, 38, { size: 26, bold: true, color });
    text(s, name, x + 19, 525, 225, 28, { size: 18, color: C.ink });
    x += 292;
  }
  text(s, "Cloudinary stores source documents while MongoDB stores extracted chunks and embeddings.", 62, 608, 1120, 32, { size: 18, color: C.muted, align: "center" });
  note(s, ["Source: README.md API Endpoints, server/seed.js, server/models/Session.js, and server/routes."]);
}

// 10. Experience
{
  const s = deck.slides.add(); header(s, "User and Admin Experience", 10);
  const landing = await fs.readFile(path.join(workspaceDir, ".codex-build", "assets", "landing-settled.png"));
  const chat = await fs.readFile(path.join(workspaceDir, ".codex-build", "assets", "chat-settled.png"));
  text(s, "Landing and product positioning", 63, 124, 520, 31, { size: 20, bold: true, color: C.ink });
  s.images.add({ blob: new Uint8Array(landing), contentType: "image/png", alt: "Helix landing page", fit: "cover", geometry: "roundRect", borderRadius: 12, position: { left: 63, top: 167, width: 545, height: 307 } });
  text(s, "Focused conversation workspace", 672, 124, 520, 31, { size: 20, bold: true, color: C.ink });
  s.images.add({ blob: new Uint8Array(chat), contentType: "image/png", alt: "Helix chat page", fit: "cover", geometry: "roundRect", borderRadius: 12, position: { left: 672, top: 167, width: 545, height: 307 } });
  bulletList(s, [
    "Responsive dark and light themes with accessible input controls",
    "Socket.io updates switch the conversation to a human agent",
    "Admin pages manage tickets, knowledge documents, and operational analytics",
  ], 126, 513, 1028, 103, { size: 19, spaceAfterPt: 7 });
  note(s, ["Screenshots captured from the local project on 2026-09-29.", "Source: client/src/routes and client/src/styles.css."]);
}

// 11. Testing
{
  const s = deck.slides.add(); header(s, "Testing and Evaluation", 11);
  box(s, 63, 139, 363, 418, "#ECFBF6", "roundRect", "#BDEBDB", 1.5);
  text(s, "11", 95, 170, 300, 106, { size: 84, bold: true, color: C.green, align: "center" });
  text(s, "unit tests passed", 95, 272, 300, 41, { size: 27, bold: true, color: C.ink, align: "center" });
  text(s, "2 suites verified on 29 September 2026", 95, 331, 300, 65, { size: 20, color: C.muted, align: "center" });
  text(s, "Coverage includes the agent loop, order lookup, refund checks, duplicate prevention, escalation, and error handling.", 95, 423, 300, 92, { size: 18, color: C.ink, align: "center" });
  const checks = [
    ["Unit tests", "Verified passing", C.green],
    ["Integration runner", "Available, requires live databases", C.blue],
    ["Prompt-injection runner", "Available, requires configured services", C.purple],
    ["RAG evaluation", "30-query recall and precision script", C.amber],
  ];
  let y = 139;
  for (const [name, status, color] of checks) {
    box(s, 492, y, 725, 92, C.white, "roundRect", C.line, 1);
    box(s, 511, y + 25, 42, 42, color, "ellipse", color, 0);
    text(s, "✓", 511, y + 27, 42, 36, { size: 22, bold: true, color: C.white, align: "center" });
    text(s, name, 577, y + 17, 260, 30, { size: 21, bold: true, color: C.ink });
    text(s, status, 858, y + 20, 330, 48, { size: 18, color: C.muted, align: "right" });
    y += 112;
  }
  text(s, "The deck reports only the unit suite as executed and passing.", 492, 607, 725, 31, { size: 18, bold: true, color: C.red, align: "center" });
  note(s, ["Unit command executed: npm test in server directory.", "Result: 2 suites passed and 11 tests passed.", "Other runners exist in server/package.json but were not executed because they require configured external services."]);
}

// 12. Limitations
{
  const s = deck.slides.add(); header(s, "Limitations and Future Scope", 12);
  label(s, "Current tradeoffs", 62, 127, 490, C.red);
  label(s, "Recommended next steps", 665, 127, 490, C.green);
  const left = [
    "Agent memory lives in one server process",
    "Chat responses return only after the full tool loop",
    "Reranking uses exact term overlap instead of a learned model",
    "Knowledge ingestion currently accepts PDF files",
    "Rate limits reset when the server restarts",
    "Refund confirmation still depends on model behavior",
  ];
  const right = [
    "Move session memory and rate counters to Redis",
    "Stream partial responses through SSE or WebSockets",
    "Add a cross-encoder reranker and retrieval telemetry",
    "Support DOCX, TXT, JSON, and CSV ingestion",
    "Add a deterministic approval gate for refunds",
    "Summarize long conversations before the context limit",
  ];
  bulletList(s, left, 62, 178, 520, 392, { size: 20, spaceAfterPt: 12 });
  bulletList(s, right, 665, 178, 520, 392, { size: 20, spaceAfterPt: 12 });
  box(s, 62, 588, 1123, 50, "#FFF7E8", "roundRect", "#FAD99D", 1);
  text(s, "Priority: make state and policy enforcement deterministic before scaling traffic.", 82, 601, 1083, 28, { size: 20, bold: true, color: C.ink, align: "center" });
  note(s, ["Source: README.md Known Limitations & Design Tradeoffs section."]);
}

// 13. Closing
{
  const s = deck.slides.add(); header(s, "Project Outcome", 13);
  text(s, "A working support system that connects grounded answers to real customer-service actions.", 101, 147, 1078, 103, { size: 38, bold: true, color: C.ink, align: "center", valign: "middle" });
  const outcomes = [
    ["Grounded", "Hybrid RAG searches store-specific knowledge.", C.blue],
    ["Actionable", "Tools query orders and create refund records.", C.green],
    ["Supervised", "Complex cases carry context into human support.", C.purple],
    ["Observable", "Tests, analytics, feedback, and audit logs expose behavior.", C.red],
  ];
  let x = 66;
  for (const [title, desc, color] of outcomes) {
    box(s, x, 319, 263, 190, C.white, "roundRect", C.line, 1);
    box(s, x, 319, 263, 11, color, "rect", color, 0);
    text(s, title, x + 20, 354, 222, 34, { size: 24, bold: true, color });
    text(s, desc, x + 20, 408, 222, 72, { size: 18, color: C.muted });
    x += 292;
  }
  text(s, "Thank you", 101, 565, 1078, 51, { font: HEAD, size: 34, bold: true, color: C.red, align: "center" });
  note(s, ["Closing summary based on implemented features in the project repository."]);
}

const stagingDir = path.join(workspaceDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate-ai-support-chatbot.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);

const result = await finalizePresentation({
  explicitTotalSlideCount: 13,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: [BODY, HEAD, "Consolas"] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "AI_Support_Chatbot_Project_Presentation_Final.validation.json"),
});

console.log(JSON.stringify({ finalPath: FINAL_PPTX, result }, null, 2));
