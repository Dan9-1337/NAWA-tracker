import type { pl } from './pl';

type DeepString<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends readonly (infer U)[]
    ? readonly DeepString<U>[]
    : T extends object
      ? { [K in keyof T]: DeepString<T[K]> }
      : string;

export type Locale = 'pl' | 'en' | 'ru';

export type Messages = DeepString<typeof pl>;
