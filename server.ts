import { serve } from "bun";
import { handleChat } from "./chat/handler";

const port = 3001;
console.log(`Chat API server running on port ${port}`);

serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      return handleChat(req);
    }
    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }
    return new Response("Not found", { status: 404 });
  },
});
