import { Length } from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['value'])
export class Role {
   @PrimaryGeneratedColumn()
   id: number;

   @Column()
   @Length(1, 80)
   value: string;
}
