import { handleChat } from "../chat/handler";

// Vercel serverless entry for POST /api/chat. The same handler powers the
// local Bun server (server.ts) used during development.
export function POST(request: Request): Promise<Response> {
  return handleChat(request);
}

export function GET(): Response {
  return Response.json({ ok: true, hint: "POST a chat message to this endpoint." });
}
