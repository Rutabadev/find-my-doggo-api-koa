import Router from '@koa/router';
import { general, user } from './controller';

const unprotectedRouter = new Router();

// Hello World route
unprotectedRouter.get('/', general.helloWorld);

// User routes
unprotectedRouter.post('/users/login', user.login);
unprotectedRouter.post('/users', user.createUser);

export { unprotectedRouter };
