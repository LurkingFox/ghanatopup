import { createClient } from '@supabase/supabase-js';
import { FastifyReply, FastifyRequest } from 'fastify';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  // We don't throw here to keep dev flow; routes will error if keys are missing.
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_KEY is not set. Auth routes will not work without these.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  }
});

export async function supabaseAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = (request.headers.authorization as string) || '';
  if (!authHeader) {
    reply.code(401).send({ error: 'Missing Authorization header' });
    return;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      reply.code(401).send({ error: 'Invalid or expired token' });
      return;
    }
    // attach user to request for downstream handlers
    (request as any).user = data.user;
  } catch (err) {
    reply.code(500).send({ error: 'Auth verification failed' });
  }
}
