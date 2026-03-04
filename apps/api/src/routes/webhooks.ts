import { FastifyInstance } from 'fastify';
import { verifyMomoWebhook } from '../services/momo';
import { verifyReloadlyWebhook } from '../services/reloadly';

export default async function webhooksRoutes(server: FastifyInstance) {
  server.post('/api/v1/webhooks/momo/callback', async (request, reply) => {
    const raw = (request as any).bodyRaw || JSON.stringify(request.body);
    const sig = (request.headers['x-hmac-signature'] as string) || (request.headers['x-signature'] as string);
    const ok = verifyMomoWebhook(typeof raw === 'string' ? raw : JSON.stringify(raw), sig);
    if (!ok) {
      server.log.warn('Invalid MoMo webhook signature');
      return reply.code(401).send({ error: 'invalid signature' });
    }

    // TODO: parse payload, find transaction by payment ref, update status
    server.log.info('Received valid MoMo webhook', request.body);
    return reply.send({ status: 'ok' });
  });

  server.post('/api/v1/webhooks/reloadly/callback', async (request, reply) => {
    const rawBody = (request as any).bodyRaw || JSON.stringify(request.body);
    const sig = (request.headers['x-signature'] as string) || '';
    const ok = verifyReloadlyWebhook(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), sig);
    if (!ok) return reply.code(401).send({ error: 'invalid signature' });

    // TODO: handle reloadly success/failure, update transaction/delivery status
    server.log.info('Received Reloadly webhook', request.body);
    return reply.send({ status: 'ok' });
  });
}
