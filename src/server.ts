import cors from '@koa/cors';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import jwt from 'koa-jwt';
import path from 'path';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import winston from 'winston';
import { config } from './config';
import { cron } from './cron';
import { reset } from './custom_migration/reset';
import { logger } from './logger';
import { protectedRouter } from './protectedRoutes';
import { unprotectedRouter } from './unprotectedRoutes';

// create connection with database
// note that its not active database connection
// TypeORM creates you connection pull to uses connections from pull on your requests
createConnection({
   type: 'postgres',
   url: config.databaseUrl,
   synchronize: true,
   logging: false,
   entities: config.dbEntitiesPath,
   migrations: [path.join(__dirname, './migration/*')],
   extra: {
      ssl: config.dbsslconn, // if not development, will use SSL
   },
})
   .then(async () => {
      const app = new Koa();

      // Uncomment this if you want to reset the db
      // await reset();

      // Provides important security headers to make your app more secure
      app.use(helmet());

      // Enable cors with default options
      app.use(cors());

      // Logger middleware -> use winston as logger (logging.ts with config)
      app.use(logger(winston));

      // Enable bodyParser with default options
      app.use(bodyParser());

      // these routes are NOT protected by the JWT middleware, also include middleware to respond with "Method Not Allowed - 405".
      app.use(unprotectedRouter.routes()).use(
         unprotectedRouter.allowedMethods()
      );

      // JWT middleware -> below this line routes are only reached if JWT token is valid, secret as env variable
      // do not protect swagger-json and swagger-html endpoints
      app.use(
         jwt({ secret: config.jwtSecret }).unless({ path: [/^\/swagger-/] })
      );

      // These routes are protected by the JWT middleware, also include middleware to respond with "Method Not Allowed - 405".
      app.use(protectedRouter.routes()).use(protectedRouter.allowedMethods());

      // Register cron job to do any action needed
      cron.start();

      app.listen(config.port);

      console.log(`Server running on port ${config.port}`);
   })
   .catch((error: string) => console.log('TypeORM connection error: ', error));
