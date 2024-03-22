export * from './FloorToken';
export * from './TransferTaxToken';

import * as FT from './FloorToken';
import * as TTT from './TransferTaxToken-external';
import { Args } from '@massalabs/as-types';
import * as ERC20 from './ERC20/token';

export function constructor(bs: StaticArray<u8>): void {
  const args = new Args(bs);

  const tokenY = args.nextString().expect('tokenY is missing or invalid');
  const factory = args.nextString().expect('factory is missing or invalid');
  const activeId = args.nextU32().expect('activeId is missing or invalid');
  const binStep = args.nextU16().expect('binStep is missing or invalid');
  const floorPerBin = args
    .nextU256()
    .expect('floorPerBin is missing or invalid');
  FT.constructor(
    new Args()
      .add(tokenY)
      .add(factory)
      .add(activeId)
      .add(binStep)
      .add(floorPerBin)
      .serialize(),
  );

  const name = args.nextString().expect('name is missing or invalid');
  const symbol = args.nextString().expect('symbol is missing or invalid');
  TTT.constructor(new Args().add(name).add(symbol).serialize());
}

export function totalSupply(_: StaticArray<u8>): StaticArray<u8> {
  return ERC20.totalSupply(_);
}

export function balanceOf(bs: StaticArray<u8>): StaticArray<u8> {
  return ERC20.balanceOf(bs);
}

export function _mint(bs: StaticArray<u8>): void {
  ERC20.mint(bs);
}

export function _burn(bs: StaticArray<u8>): void {
  ERC20.burnFrom(bs);
}

// export function _beforeTokenTransfer(bs: StaticArray<u8>): void {
//   // FloorToken._beforeTokenTransfer(from, to, amount);
// }

// Add additional business logic here
// ....

export function event(bs: StaticArray<u8>): void {
  // FloorToken.event(bs);
}
