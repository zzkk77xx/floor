export * from './FloorToken';

import * as FT from './FloorToken';

export function constructor(binaryArgs: StaticArray<u8>): void {
  FT.constructor(binaryArgs);
}
