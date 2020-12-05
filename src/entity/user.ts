import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Length, IsEmail } from 'class-validator';

@Entity()
@Unique(['name'])
@Unique(['email'])
export class User {
   @PrimaryGeneratedColumn()
   id: number;

   @Column({
      length: 80,
   })
   @Length(1, 80)
   name: string;

   @Column({
      length: 100,
      nullable: true,
   })
   @Length(10, 100)
   @IsEmail()
   email: string;

   @Column()
   @Length(5, 80)
   password: string;
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
