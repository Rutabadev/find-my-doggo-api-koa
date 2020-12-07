import argon2 from 'argon2';
import { getManager } from 'typeorm';
import { Role, User } from '../entity';

export const reset = async () => {
   await getManager().delete(Role, {});
   await getManager().delete(User, {});

   const adminRole = new Role();
   adminRole.value = 'admin';
   await getManager().getRepository(Role).save(adminRole);

   const user = new User();
   const role = await getManager()
      .getRepository(Role)
      .findOne({ value: 'admin' });
   user.roles = [role];
   user.name = 'bob';
   user.password = await argon2.hash('bob');
   getManager().getRepository(User).save(user);
};
