export default  () => ({
  port: process.env.PORT || 3001,
  AUTH_MICROSERVICE_HOST: process.env.AUTH_MICROSERVICE_HOST || 'localhost',
  AUTH_MICROSERVICE_PORT: process.env.AUTH_MICROSERVICE_PORT || 3002,
});
