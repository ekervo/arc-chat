import type { IncomingMessage, ServerResponse } from "node:http";
import { handleChat } from "../chat/handler.js";

// Vercel serverless entry for /api/chat. The same handler powers the local
// Bun server (server.ts) used during development.
export const config = { maxDuration: 30 };

type ApiRequest = IncomingMessage & { body?: unknown };

async function readBody(req: ApiRequest): Promise<string> {
  const { body } = req;
  if (typeof body === "string") return body;
  if (body instanceof Uint8Array) return Buffer.from(body).toString("utf8");
  if (body !== undefined && body !== null) return JSON.stringify(body);
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(
  req: ApiRequest,
  res: ServerResponse,
): Promise<void> {
  const method = req.method ?? "GET";
  const init: RequestInit = {
    method,
    headers: { "content-type": "application/json" },
  };
  if (method === "POST") init.body = await readBody(req);

  const response = await handleChat(new Request("http://localhost/api/chat", init));
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await response.text());
}
