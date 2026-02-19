import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }),
});

// Source-specific child loggers
export const loggers = {
  prtg: logger.child({ source: 'prtg' }),
  vcenter: logger.child({ source: 'vcenter' }),
  proxmox: logger.child({ source: 'proxmox' }),
  veeam: logger.child({ source: 'veeam' }),
  glpi: logger.child({ source: 'glpi' }),
  st: logger.child({ source: 'securetransport' }),
  cache: logger.child({ source: 'cache' }),
  auth: logger.child({ source: 'auth' }),
} as const;
