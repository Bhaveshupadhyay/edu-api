import Redis from "ioredis";
import logger from "../libs/logger.js";
import { RPASSWORD, HOST } from "./env.js";

const redisClient = new Redis({
    host: HOST,
    password: RPASSWORD,
    port: 6379,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        if (times > 10) {
            logger.error("Redis max retries reached. Connection failed.");
            return null; // Stop retrying
        }
        return Math.min(times * 100, 3000); // Exponential backoff
    },
    connectTimeout: 10000
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connecting...'));
redisClient.on('ready', () => logger.info('Redis Client Connected and Ready'));
redisClient.on('reconnecting', () => logger.warn('Redis Client Reconnecting...'));

export default redisClient;
