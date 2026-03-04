import { FastifyInstance } from 'fastify';
import { initiateTransactionSchema } from '@ghanatopup/shared';
import { supabaseAuth } from '../middleware/supabaseAuth';
import { insertTransaction, getTransactionsByUser, getTransactionById } from '../db/client';
import { enqueueTopupJob } from '../queues/topupQueue';

export default async function transactionsRoutes(server: FastifyInstance) {
  // Initiate a new transaction
  server.post('/api/v1/transactions/initiate', { preHandler: supabaseAuth }, async (request, reply) => {
    const parsed = initiateTransactionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.errors });
    const user = (request as any).user;
    try {
      const tx = await insertTransaction({
        user_id: user.id,
        recipient_number: parsed.data.recipientNumber,
        network: parsed.data.network,
        type: parsed.data.type,
        bundle_id: parsed.data.bundleId || null,
        amount_ghs: parsed.data.amountGhs,
        payment_method: null,
        payment_ref: null
      });

      // enqueue delivery job (placeholder)
      const job = enqueueTopupJob(tx.id as string);

      return reply.code(201).send({ transaction: tx, jobId: job.id });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to create transaction' });
    }
  });

  // List transactions for user
  server.get('/api/v1/transactions', { preHandler: supabaseAuth }, async (request, reply) => {
    const user = (request as any).user;
    try {
      const data = await getTransactionsByUser(user.id);
      return reply.send({ transactions: data });
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch transactions' });
    }
  });

  // Get single transaction
  server.get('/api/v1/transactions/:id', { preHandler: supabaseAuth }, async (request, reply) => {
    const user = (request as any).user;
    const id = (request.params as any).id;
    try {
      const tx = await getTransactionById(id);
      if (!tx) return reply.code(404).send({ error: 'Not found' });
      if (tx.user_id !== user.id) return reply.code(403).send({ error: 'Forbidden' });
      return reply.send({ transaction: tx });
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch transaction' });
    }
  });
}
