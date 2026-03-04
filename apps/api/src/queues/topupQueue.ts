// Minimal in-memory queue stub for top-up jobs.
// Replace with BullMQ worker implementation when Redis is available.

type TopupJob = {
  id: string;
  transactionId: string;
  createdAt: number;
};

const jobs: TopupJob[] = [];

export function enqueueTopupJob(transactionId: string) {
  const job: TopupJob = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, transactionId, createdAt: Date.now() };
  jobs.push(job);
  // For now just log — a worker will be added later to process these jobs.
  console.info('Enqueued topup job', job);
  return job;
}

export function getPendingJobs() {
  return jobs.slice();
}
