import { Context } from '@massalabs/massa-as-sdk';

export function constructor(binaryArgs: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), 'already initialized');
}
