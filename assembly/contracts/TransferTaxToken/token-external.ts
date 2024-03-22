import { Args, u256ToBytes } from '@massalabs/as-types';
import {
  Address,
  Context,
  Storage,
  generateEvent,
} from '@massalabs/massa-as-sdk';
import {
  TAX_RATE,
  TAX_RECIPIENT,
  _EXCLUDED_BOTH,
  _EXCLUDED_FROM,
  _EXCLUDED_TO,
} from '../../storage/TransferTaxToken';
import * as Ownable from '@massalabs/sc-standards/assembly/contracts/utils/ownership';
import {
  _excludedFromTax,
  _setExcludedFromTax,
  _setTaxRate,
  _setTaxRecipient,
  _transfer as _innerTransfer,
} from './token-internal';
import * as ERC20 from '../ERC20/token';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { PRECISION, SafeMath256 } from '@dusalabs/core';

/**
 * @title Transfer Tax Token
 * @author Trader Joe
 * @notice An ERC20 token that has a transfer tax.
 * The tax is calculated as `amount * taxRate / PRECISION`, where `PRECISION = 1e18`.
 * The tax is deducted from the amount before the transfer and sent to the tax recipient.
 * The tax recipient and tax rate can be changed by the owner, as well as the exclusion status of accounts from tax.
 */

/**
 * @notice Constructor that initializes the token's name and symbol.
 * @param name The name of the token.
 * @param symbol The symbol of the token.
 * @param owner The owner of the token.
 */
export function constructor(bs: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), 'already initialized');

  const args = new Args(bs);
  const name = args.nextString().expect('name is missing or invalid');
  const symbol = args.nextString().expect('symbol is missing or invalid');

  // 18 decimals and 0 initial supply by default
  const decimals: u8 = 18;
  const supply = u256.Zero;
  ERC20.constructor(
    new Args().add(name).add(symbol).add(decimals).add(supply).serialize(),
  );

  // // Initialize the tax recipient to the contract creator
  // _setTaxRecipient(Context.caller());
  // _setTaxRate(
  //   SafeMath256.div(SafeMath256.mul(u256.from(45), PRECISION), u256.from(1000)),
  // ); // 4.5%
}

/**
 * @notice Returns:
 * - `0` if `account` is not excluded from transfer tax,
 * - `1` if `account` is excluded from transfer tax when sending to another account,
 * - `2` if `account` is excluded from transfer tax when receiving from another account,
 * - `3` if `account` is excluded from transfer tax on both sending and receiving,
 * @param account The account to check.
 * @return The exclusion status of `account` from transfer tax.
 */
export function excludedFromTax(bs: StaticArray<u8>): StaticArray<u8> {
  const account = new Address(
    new Args(bs).nextString().expect('account is missing or invalid'),
  );
  return u256ToBytes(_excludedFromTax(account));
}

/**
 * @notice Sets the transfer tax recipient to `newTaxRecipient`.
 * @dev Only callable by the owner.
 * @param newTaxRecipient The new transfer tax recipient.
 */
export function setTaxRecipient(bs: StaticArray<u8>): void {
  Ownable.onlyOwner();

  const newTaxRecipient = new Address(
    new Args(bs).nextString().expect('newTaxRecipient is missing or invalid'),
  );

  _setTaxRecipient(newTaxRecipient);
}

/**
 * @notice Sets the transfer tax rate to `newTaxRate`.
 * @dev Only callable by the owner. The tax recipient must be set before setting the tax rate.
 * The tax rate must be less than or equal to 100% (1e18).
 * @param newTaxRate The new transfer tax rate.
 */
export function setTaxRate(bs: StaticArray<u8>): void {
  Ownable.onlyOwner();

  const newTaxRate = new Args(bs)
    .nextU256()
    .expect('newTaxRate is missing or invalid');
  _setTaxRate(newTaxRate);
}

/**
 * @notice Sets the exclusion status of `account` from transfer tax.
 * @dev Only callable by the owner.
 * @param account The account to set the exclusion status of.
 * @param excludedStatus The new exclusion status of `account` from transfer tax.
 */
export function setExcludedFromTax(bs: StaticArray<u8>): void {
  Ownable.onlyOwner();

  const args = new Args(bs);
  const account = new Address(
    args.nextString().expect('account is missing or invalid'),
  );
  const excludedStatus = args
    .nextU256()
    .expect('excludedStatus is missing or invalid');

  _setExcludedFromTax(account, excludedStatus);
}

export function taxRecipient(): StaticArray<u8> {
  return Storage.get(TAX_RECIPIENT);
}

export function taxRate(): StaticArray<u8> {
  return Storage.get(TAX_RATE);
}

export function _transfer(bs: StaticArray<u8>): void {
  assert(
    Context.caller().equals(Context.callee()),
    'only this contract can call this function',
  );

  const args = new Args(bs);
  const sender = new Address(
    args.nextString().expect('sender is missing or invalid'),
  );
  const recipient = new Address(
    args.nextString().expect('recipient is missing or invalid'),
  );
  const amount = args.nextU256().expect('amount is missing or invalid');

  _innerTransfer(sender, recipient, amount);
}
