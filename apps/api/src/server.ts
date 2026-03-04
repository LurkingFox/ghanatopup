import Fastify from "fastify";
import { supabase, supabaseAuth } from "./middleware/supabaseAuth";
import webhooksRoutes from "./routes/webhooks";
import transactionsRoutes from "./routes/transactions";
import { z } from "zod";

const server = Fastify({ logger: true });

server.get("/health", async () => ({ status: "ok" }));

server.get("/api/v1/ping", async () => ({ pong: Date.now() }));

// Auth: request OTP via Supabase (proxied)
server.post(
  "/api/v1/auth/request-otp",
  async (request, reply) => {
    const bodySchema = z.object({ phone: z.string() });
    const parse = bodySchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ error: 'phone is required' });

    const { phone } = parse.data;
    try {
      const { data, error } = await supabase.auth.signInWithOtp({ phone });
      if (error) return reply.code(400).send({ error: error.message });
      return reply.send(data);
    } catch (err) {
      return reply.code(500).send({ error: 'OTP request failed' });
    }
  }
);

// Auth: get user by JWT
server.get(
  "/api/v1/me",
  { preHandler: supabaseAuth },
  async (request, reply) => {
    const user = (request as any).user;
    return reply.send({ id: user.id, email: user.email, phone: user.phone });
  }
);

// Example protected route
server.get(
  "/api/v1/protected-example",
  { preHandler: supabaseAuth },
  async (request) => {
    const user = (request as any).user;
    return { message: `Hello ${user.id}`, user };
  }
);

const start = async () => {
  try {
    await server.listen({ port: Number(process.env.PORT) || 3000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

// Register webhook routes (need raw body for HMAC verification)
// Fastify: to access raw body you may need to register a content parser that stores raw body
server.addContentTypeParser('*', { parseAs: 'buffer' }, (req, payload, done) => {
  payload.on('data', () => {});
  payload.on('end', () => done(null, payload));
});

// small wrapper to expose raw body on request object
server.addHook('preHandler', (request, _reply, done) => {
  try {
    const raw = request.raw?.body || request.body;
    (request as any).bodyRaw = raw;
  } catch (e) {}
  done();
});

server.register(webhooksRoutes);
server.register(transactionsRoutes);
