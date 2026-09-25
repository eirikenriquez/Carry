import type { PassageSelection } from './PassageSelection';
import type { Reflection } from './Reflection';

export interface Carry {
  readonly id: string;
  readonly categoryId: string;
  readonly situation: string;
  readonly scheduledAt: Date;
  readonly passage: PassageSelection;
  readonly ifThenIntention: string;
  readonly reflection?: Reflection;
  readonly reminderId?: string;
  readonly createdAt: Date;
}
