import express, { Application, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import { config } from './config/config';
import { passportService, PassportService } from './services/passwordService';
import authRoutes from './routes/authRouter';
import { errorHandler } from './middleware/ErrorMiddleware';
import { NotFoundError } from './error/appError';

const app: Application = express();

const redisClient = createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`
});

redisClient.on('error', (err) => console.error('Redis error:', err));

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passportService.initialize());
app.use(passportService.session());

app.use('/api/auth', authRoutes);

app.use((req, res, next) => {
  next(new NotFoundError('Not Found'));
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`AuthMicroservice running on port ${config.port}`);
});