import { ONE_COIN } from '@dusalabs/core';

export class Tuple<T, U> {
  constructor(public readonly _0: T, public readonly _1: U) {}
}

export const masToSend = ONE_COIN; // storage cost (the leftover is sent back)
