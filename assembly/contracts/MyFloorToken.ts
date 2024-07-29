export * from './FloorToken/token';
export * from './TransferTaxToken/token';

import * as FT from './FloorToken/token';
import * as TTT from './TransferTaxToken/token-external';
import { Args } from '@massalabs/as-types';
import * as ERC20 from './ERC20/token';
import {
  Address,
  Context,
  functionExists,
  setBytecode,
} from '@massalabs/massa-as-sdk';
import { _isOwner } from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';

export function constructor(bs: StaticArray<u8>): void {
  const args = new Args(bs);

  const tokenY = args.nextString().expect('tokenY is missing or invalid');
  const factory = args.nextString().expect('factory is missing or invalid');
  const activeId = args.nextU32().expect('activeId is missing or invalid');
  const binStep = args.nextU32().expect('binStep is missing or invalid');
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
  const decimals = args.nextU8().expect('decimals is missing or invalid');
  const supply = args.nextU256().expect('supply is missing or invalid');
  const taxRate = args.nextU256().expect('taxRate is missing or invalid');
  const taxRecipient = new Address('0'); // important in order to burn tax amount
  TTT.constructor(
    new Args()
      .add(name)
      .add(symbol)
      .add(decimals)
      .add(supply)
      .add(taxRecipient)
      .add(taxRate)
      .serialize(),
  );
}

// ==================================================== //
// ====                 OVERRIDES                  ==== //
// ==================================================== //

export function totalSupply(_: StaticArray<u8>): StaticArray<u8> {
  return ERC20.totalSupply(_);
}

export function balanceOf(bs: StaticArray<u8>): StaticArray<u8> {
  return ERC20.balanceOf(bs);
}

/**
 * @notice safety access check is done in the internal function
 */
export function _mint(bs: StaticArray<u8>): void {
  ERC20.mint(bs);
}

/**
 * @notice safety access check is done in the internal function
 */
export function _burn(bs: StaticArray<u8>): void {
  ERC20.burnFrom(bs);
}

// Add additional business logic here
// ....

export function upgrade(bs: StaticArray<u8>): void {
  assert(
    _isOwner(Context.caller().toString()),
    'only owner can upgrade the contract',
  );

  setBytecode(bs);
  // assert(
  //   functionExists(Context.callee(), 'upgrade'),
  //   'upgrade not found in new contract',
  // );
}
