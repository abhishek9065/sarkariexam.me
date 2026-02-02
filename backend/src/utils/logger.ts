import pino from 'pino';

import { config } from '../config.js';

const logger = pino({
  level: config.isProduction ? 'info' : 'debug',
  transport: !config.isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  base: {
    service: 'sarkari-api',
  },
});

export default logger;
