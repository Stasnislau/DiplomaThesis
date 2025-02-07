export const AUTH_MICROSERVICE_URL = process.env.AUTH_MICROSERVICE_URL || 'http://localhost:3002';
export const BRIDGE_MICROSERVICE_URL = process.env.BRIDGE_MICROSERVICE_URL || 'http://localhost:3003';
export const USER_MICROSERVICE_URL = process.env.USER_MICROSERVICE_URL || 'http://localhost:3004';

export const AVAILABLE_MICROSERVICES = ["auth", "bridge", "user"] as const;
