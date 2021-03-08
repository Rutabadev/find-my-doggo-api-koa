import { BaseContext } from 'koa';
import { getManager, Repository, Not, Equal, Like, In } from 'typeorm';
import { validate, ValidationError } from 'class-validator';
import {
   request,
   summary,
   path,
   body,
   responsesAll,
   tagsAll,
} from 'koa-swagger-decorator';
import { User, userSchema, loginSchema, Role } from '../entity';
import { ParamError } from '../types';
import jsonWebToken from 'jsonwebtoken';
import { config } from '../config';
import argon2 from 'argon2';

@responsesAll({
   200: { description: 'success' },
   400: { description: 'bad request' },
   401: { description: 'unauthorized, missing/wrong jwt token' },
})
@tagsAll(['User'])
export default class UserController {
   @request('post', '/users/login')
   @summary('Login a user')
   @body(loginSchema)
   public static async login(ctx: BaseContext): Promise<void> {
      const errors: ParamError[] = [];
      const { usernameOrEmail, password } = ctx?.request?.body;
      if (!usernameOrEmail) {
         errors.push({
            field: 'usernameOrEmail',
            message: 'username or email is required',
         });
      }

      if (!password) {
         errors.push({
            field: 'password',
            message: 'password is required',
         });
      }

      if (errors.length) {
         ctx.status = 400;
         ctx.body = { errors };
         return;
      }

      const userRepository = getManager().getRepository(User);
      // Using a specific "addSelect" to return password declared as not selectable
      const user = await userRepository
         .createQueryBuilder('user')
         .select('user.id')
         .addSelect('user.password')
         .where('user.name = :name', { name: usernameOrEmail })
         .orWhere('user.email = :email', { email: usernameOrEmail })
         .getOne();

      if (!user || !(await argon2.verify(user.password, password))) {
         ctx.status = 400;
         ctx.body = 'Invalid password';
         return;
      }

      const jwt = jsonWebToken.sign(
         {
            uid: user.id,
            exp: Math.floor(Date.now() / 1000) + config.jwtExpiration,
         },
         config.jwtSecret
      );
      ctx.status = 200;
      ctx.body = { jwt };
   }

   @request('get', '/users/me')
   @summary('Get the currently logged in user info')
   public static async getMe(ctx: BaseContext): Promise<void> {
      const userRepository: Repository<User> = getManager().getRepository(User);
      const user: any = await userRepository.findOne(ctx.state.user.uid, {
         relations: ['roles'],
      });
      user.roles = user.roles.map((role: Role) => role.value);
      if (!user) {
         return;
      }
      ctx.body = user;
   }

   @request('get', '/users')
   @summary('Find all users')
   public static async getUsers(ctx: BaseContext): Promise<void> {
      // get a user repository to perform operations with user
      const userRepository: Repository<User> = getManager().getRepository(User);

      // load all users and their roles
      const users: User[] = await userRepository.find({ relations: ['roles'] });

      // return OK status code and loaded users array
      ctx.status = 200;
      ctx.body = users;
   }

   @request('get', '/users/{id}')
   @summary('Find user by id')
   @path({
      id: { type: 'number', required: true, description: 'id of user' },
   })
   public static async getUser(ctx: BaseContext): Promise<void> {
      // get a user repository to perform operations with user
      const userRepository: Repository<User> = getManager().getRepository(User);

      // load user by id
      const user: User | undefined = await userRepository.findOne(
         +ctx.params.id || 0
      );

      if (!user) {
         // return a BAD REQUEST status code and error message
         ctx.status = 400;
         ctx.body =
            "The user you are trying to retrieve doesn't exist in the db";
      }

      // return OK status code and loaded user object
      ctx.status = 200;
      ctx.body = user;
   }

   @request('post', '/users')
   @summary('Create a user')
   @body(userSchema)
   public static async createUser(ctx: BaseContext): Promise<void> {
      // get a user repository to perform operations with user
      const userRepository: Repository<User> = getManager().getRepository(User);
      const { password, roles } = ctx.request.body;
      const errors: ParamError[] = [];

      // build up entity user to be saved
      const userToBeSaved = (userRepository.create(
         ctx.request.body
      ) as unknown) as User;

      if (roles?.length) {
         try {
            userToBeSaved.roles = await getManager()
               .getRepository(Role)
               .find({ value: In(roles as string[]) });
         } catch (err) {
            errors.push({
               field: 'roles',
               message: 'roles must be an array of strings',
            });
            userToBeSaved.roles = [];
         }
      }

      // validate user entity
      const validationErrors = await validate(userToBeSaved);
      validationErrors.forEach((err) =>
         Object.values(err.constraints).forEach((constraint: string) => {
            errors.push({
               field: err.property,
               message: constraint,
            });
         })
      );

      if (await userRepository.findOne({ name: userToBeSaved.name })) {
         errors.push({
            field: 'name',
            message: 'User with same name already exists',
         });
      }
      if (await userRepository.findOne({ email: userToBeSaved.email })) {
         errors.push({
            field: 'email',
            message: 'User with same email already exists',
         });
      }

      if (errors.length) {
         ctx.status = 400;
         ctx.body = { errors };
         return;
      }

      userToBeSaved.password = await argon2.hash(password);
      try {
         // save the user contained in the POST body
         const user = await userRepository.save(userToBeSaved);
         // return CREATED status code and updated user
         ctx.status = 201;
         ctx.body = user;
      } catch (err) {
         ctx.status = 400;
         ctx.body = err.detail || 'Error saving user';
      }
   }

   @request('put', '/users/{id}')
   @summary('Update a user')
   @path({
      id: { type: 'number', required: true, description: 'id of user' },
   })
   @body(userSchema)
   public static async updateUser(ctx: BaseContext): Promise<void> {
      if (!ctx.params.id) {
         ctx.status = 400;
         ctx.body = { error: 'Id is required' };
         return;
      }

      // get a user repository to perform operations with user
      const userRepository: Repository<User> = getManager().getRepository(User);
      const { roles } = ctx.request.body;
      const errors: ParamError[] = [];

      // Get the user to update
      let userToBeUpdated = await userRepository.findOne(+ctx.params.id);

      // update the user by specified id
      // build up entity user to be updated
      userToBeUpdated = {
         ...userToBeUpdated,
         ...ctx.request.body,
      };

      try {
         if (roles.length) {
            userToBeUpdated.roles = await getManager()
               .getRepository(Role)
               .find({ value: In(roles as string[]) });
         }
      } catch (err) {
         errors.push({
            field: 'roles',
            message: 'roles must be an array of strings',
         });
         userToBeUpdated.roles = [];
      }

      // validate user entity
      const validationErrors: ValidationError[] = await validate(
         userToBeUpdated
      );
      validationErrors.forEach((err) =>
         Object.values(err.constraints).forEach((constraint: string) => {
            errors.push({
               field: err.property,
               message: constraint,
            });
         })
      );

      if (errors.length) {
         // return BAD REQUEST status code and errors array
         ctx.status = 400;
         ctx.body = errors;
      } else if (!(await userRepository.findOne(userToBeUpdated.id))) {
         // check if a user with the specified id exists
         // return a BAD REQUEST status code and error message
         ctx.status = 400;
         ctx.body = "The user you are trying to update doesn't exist in the db";
      } else if (
         userToBeUpdated.email &&
         (await userRepository.findOne({
            id: Not(Equal(userToBeUpdated.id)),
            email: userToBeUpdated.email,
         }))
      ) {
         // return BAD REQUEST status code and email already exists error
         ctx.status = 400;
         ctx.body = 'The specified e-mail address already exists';
      } else {
         if (userToBeUpdated.password) {
            userToBeUpdated.password = await argon2.hash(
               userToBeUpdated.password
            );
         }
         // save the user contained in the PUT body
         try {
            const user = await userRepository.save(userToBeUpdated);
            // return CREATED status code and updated user
            ctx.status = 201;
            ctx.body = user;
         } catch (err) {
            ctx.status = 400;
            ctx.body = err?.detail || 'User saving error';
         }
      }
   }

   @request('delete', '/users/{id}')
   @summary('Delete user by id')
   @path({
      id: { type: 'number', required: true, description: 'id of user' },
   })
   public static async deleteUser(ctx: BaseContext): Promise<void> {
      // get a user repository to perform operations with user
      const userRepository = getManager().getRepository(User);

      // find the user by specified id
      const userToRemove: User | undefined = await userRepository.findOne(
         +ctx.params.id || 0
      );
      const user = await userRepository.findOne(ctx.state.user.uid, {
         relations: ['roles'],
      });
      if (!userToRemove) {
         // return a BAD REQUEST status code and error message
         ctx.status = 400;
         ctx.body = "The user you are trying to delete doesn't exist in the db";
      } else if (
         user.name !== userToRemove.name &&
         user?.roles?.map((role) => role.value).includes('admin') !== true
      ) {
         // check user's token id and user id are the same
         // if not, return a FORBIDDEN status code and error message
         ctx.status = 403;
         ctx.body = 'A user can only be deleted by himself';
      } else {
         // the user is there so can be removed
         await userRepository.remove(userToRemove);
         // return a NO CONTENT status code
         ctx.status = 204;
      }
   }

   @request('delete', '/testusers')
   @summary('Delete users generated by integration and load tests')
   public static async deleteTestUsers(ctx: BaseContext): Promise<void> {
      // get a user repository to perform operations with user
      const userRepository = getManager().getRepository(User);

      // find test users
      const usersToRemove: User[] = await userRepository.find({
         where: { email: Like('%@citest.com') },
      });

      // the user is there so can be removed
      await userRepository.remove(usersToRemove);

      // return a NO CONTENT status code
      ctx.status = 204;
   }
}
