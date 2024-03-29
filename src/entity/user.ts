import {
   Entity,
   Column,
   PrimaryGeneratedColumn,
   Unique,
   ManyToMany,
   JoinTable,
} from 'typeorm';
import { Length, IsEmail, IsOptional } from 'class-validator';
import { Role } from './role';

@Entity()
@Unique(['name'])
@Unique(['email'])
export class User {
   @PrimaryGeneratedColumn()
   id!: number;

   @Column({
      length: 80,
   })
   @Length(1, 80)
   name!: string;

   @Column({
      length: 100,
      nullable: true,
   })
   @Length(10, 100)
   @IsEmail()
   @IsOptional()
   email?: string;

   @Column({ select: false })
   @Length(1)
   password!: string;

   @ManyToMany(() => Role)
   @JoinTable()
   roles?: Role[];
}

export const userSchema = {
   name: { type: 'string', required: true, example: 'Gilles Poitou' },
   email: {
      type: 'string',
      example: 'gilles.poitou@gmail.com',
   },
   password: {
      type: 'string',
      required: true,
      example: 'aL0ngP@ssword!',
   },
   roles: {
      type: 'array',
      items: { type: 'string', example: 'admin' },
   },
};

export const loginSchema = {
   usernameOrEmail: {
      type: 'string',
      required: true,
      example: 'Gilles Poitou',
   },
   password: {
      type: 'string',
      required: true,
      example: 'aL0ngP@ssword!',
   },
};
