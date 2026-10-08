import { Redis } from 'ioredis';
import { REDIS_URL } from '$app/env/private';
import { logger } from './logger.js';

export const redis = new Redis(REDIS_URL, { lazyConnect: true });
redis.on('error', (error) => logger.warn({ err: error }, 'Redis client error'));
