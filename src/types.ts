import { User } from './entity/user';

export type ParamError = {
   field: string;
   message: string;
};

// Helper type to create a type from an existing type with one less property
type Without<T, K> = Pick<T, Exclude<keyof T, K>>;

// This type has all the user's properties except for password
export type UserNoPassword = Without<User, 'password'>;
