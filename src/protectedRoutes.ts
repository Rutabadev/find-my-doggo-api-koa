import { SwaggerRouter } from 'koa-swagger-decorator';
import { user } from './controller';

const protectedRouter = new SwaggerRouter();

// USER ROUTES
protectedRouter.get('/users/me', user.getMe);
protectedRouter.get('/users', user.getUsers);
protectedRouter.get('/users/:id', user.getUser);
protectedRouter.put('/users/:id', user.updateUser);
protectedRouter.delete('/users/:id', user.deleteUser);
protectedRouter.delete('/testusers', user.deleteTestUsers);

// Swagger endpoint
protectedRouter.swagger({
   title: 'Find My Doggo API',
   description:
      'API REST using NodeJS and KOA framework, typescript. TypeORM for SQL with class-validators. Middlewares JWT, CORS, Winston Logger.',
   version: 'CURRENT_VERSION',
});

// mapDir will scan the input dir, and automatically call router.map to all Router Class
protectedRouter.mapDir(__dirname);

export { protectedRouter };
