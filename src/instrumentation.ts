export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('@/lib/logger');
    logger.info('Instrumentation: Node.js runtime initialized');

    // Scheduled tasks
    const { Cron } = await import('croner');

    // Warm up all source caches every 2 minutes (calls upstream APIs directly, no auth needed)
    new Cron('*/2 * * * *', async () => {
      logger.info('Cron: cache warm-up started');
      try {
        const { warmupAllSources } = await import('@/lib/cache-warmup');
        await warmupAllSources();
      } catch (error) {
        logger.error({ error }, 'Cron: cache warm-up failed');
      }
    });
  }
}
