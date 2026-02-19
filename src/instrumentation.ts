export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('@/lib/logger');
    logger.info('Instrumentation: Node.js runtime initialized');

    // Scheduled tasks
    const { Cron } = await import('croner');

    // Warm up cache every 2 minutes
    new Cron('*/2 * * * *', async () => {
      logger.info('Cron: cache warm-up started');
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(10000) }).catch(() => {});
        logger.info('Cron: cache warm-up completed');
      } catch (error) {
        logger.error({ error }, 'Cron: cache warm-up failed');
      }
    });
  }
}
