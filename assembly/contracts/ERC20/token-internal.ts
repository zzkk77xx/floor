import { Args } from '@massalabs/as-types';
import { Address, Context, call } from '@massalabs/massa-as-sdk';
import {
  _balance,
  _setBalance,
} from '@massalabs/sc-standards/assembly/contracts/FT/token-internals';
import { u256 } from 'as-bignum/assembly/integer/u256';

// base _transfer function for ERC20 token
export function super_transfer(from: Address, to: Address, amount: u256): void {
  assert(from != to, 'Transfer failed: cannot send tokens to own account');

  _beforeTokenTransfer(from, to, amount);

  const currentFromBalance = _balance(from);
  const currentToBalance = _balance(to);
  // @ts-ignore
  const newToBalance = currentToBalance + amount;

  assert(currentFromBalance >= amount, 'Transfer failed: insufficient funds');
  assert(newToBalance >= currentToBalance, 'Transfer failed: overflow');
  // @ts-ignore
  _setBalance(from, currentFromBalance - amount);
  _setBalance(to, newToBalance);
}

// ==================================================== //
// ====                 OVERRIDES                  ==== //
// ==================================================== //

/// these functions must be implemented in the inheriting contract
/// with a check that the caller is the contract itself

export function _beforeTokenTransfer(
  from: Address,
  to: Address,
  amount: u256,
): void {
  call(
    Context.callee(),
    '_beforeTokenTransfer',
    new Args().add(from).add(to).add(amount),
    0,
  );
}

export function _transfer(from: Address, to: Address, amount: u256): void {
  call(
    Context.callee(),
    '_transfer',
    new Args().add(from).add(to).add(amount),
    0,
  );
}
