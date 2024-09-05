import express, { Application } from 'express';
import routes from './routes';
import { config } from './config';

const app: Application = express();

app.use(express.json());

app.use('/', routes);

app.listen(config.port, () => {
  console.log(`API Gateway running on port ${config.port}`);
});
