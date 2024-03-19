import {
  Args,
  bytesToString,
  bytesToU256,
  stringToBytes,
  u256ToBytes,
} from '@massalabs/as-types';
import { Address, Storage } from '@massalabs/massa-as-sdk';
import {
  EXCLUDED_FROM_TAX,
  TAX_RATE,
  TAX_RECIPIENT,
  _EXCLUDED_BOTH,
  _EXCLUDED_FROM,
  _EXCLUDED_TO,
} from '../storage/TransferTaxToken';
import { u256 } from 'as-bignum/assembly/integer/u256';
import * as Ownable from '@massalabs/sc-standards/assembly/contracts/utils/ownership';
import { Math512Bits, PRECISION, SafeMath256 } from '@dusalabs/core';

export * from '@massalabs/sc-standards/assembly/contracts/FT/token';
export * from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

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
  const args = new Args(bs);

  const name = args.nextString().expect('name is missing or invalid');
  const symbol = args.nextString().expect('symbol is missing or invalid');
  const owner = new Address(
    args.nextString().expect('owner is missing or invalid'),
  );

  // ERC20(name, symbol)
  // _transferOwnership(owner);
}

/**
 * @notice Returns the address of the transfer tax recipient.
 * @return The address of the transfer tax recipient.
 */
function taxRecipient(): Address {
  return new Address(bytesToString(Storage.get(TAX_RECIPIENT)));
}

/**
 * @notice Returns the transfer tax rate.
 * @return The transfer tax rate.
 */
function taxRate(): u256 {
  return bytesToU256(Storage.get(TAX_RATE));
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
  const account = new Args(bs)
    .nextString()
    .expect('account is missing or invalid');
  return u256ToBytes(_excludedFromTax(new Address()));
}

function _excludedFromTax(account: Address): u256 {
  return EXCLUDED_FROM_TAX.getSome(account.toString());
}

/**
 * @notice Sets the transfer tax recipient to `newTaxRecipient`.
 * @dev Only callable by the owner.
 * @param newTaxRecipient The new transfer tax recipient.
 */
function setTaxRecipient(newTaxRecipient: Address): void {
  Ownable.onlyOwner();

  _setTaxRecipient(newTaxRecipient);
}

/**
 * @notice Sets the transfer tax rate to `newTaxRate`.
 * @dev Only callable by the owner. The tax recipient must be set before setting the tax rate.
 * The tax rate must be less than or equal to 100% (1e18).
 * @param newTaxRate The new transfer tax rate.
 */
function setTaxRate(newTaxRate: u256): void {
  Ownable.onlyOwner();

  _setTaxRate(newTaxRate);
}

/**
 * @notice Sets the exclusion status of `account` from transfer tax.
 * @dev Only callable by the owner.
 * @param account The account to set the exclusion status of.
 * @param excludedStatus The new exclusion status of `account` from transfer tax.
 */
function setExcludedFromTax(account: Address, excludedStatus: u256): void {
  Ownable.onlyOwner();

  _setExcludedFromTax(account, excludedStatus);
}

/**
 * @dev Sets the transfer tax recipient to `newTaxRecipient`.
 * @param newTaxRecipient The new transfer tax recipient.
 */
function _setTaxRecipient(newTaxRecipient: Address): void {
  Storage.set(TAX_RECIPIENT, stringToBytes(newTaxRecipient.toString()));

  // emit TaxRecipientSet(newTaxRecipient);
}

/**
 * @dev Sets the transfer tax rate to `newTaxRate`.
 * @param newTaxRate The new transfer tax rate.
 */
function _setTaxRate(newTaxRate: u256): void {
  assert(newTaxRate <= PRECISION, 'TransferTaxToken: tax rate exceeds 100%');

  // SafeCast is not needed here since the tax rate is bound by PRECISION, which is strictly less than 2**96.
  Storage.set(TAX_RATE, u256ToBytes(newTaxRate));

  // emit TaxRateSet(newTaxRate);
}

/**
 * @dev Sets the exclusion status of `account` from transfer tax.
 * @param account The account to set the exclusion status of.
 * @param excludedStatus The new exclusion status of `account` from transfer tax.
 */
function _setExcludedFromTax(account: Address, excludedStatus: u256): void {
  assert(
    excludedStatus <= _EXCLUDED_BOTH,
    'TransferTaxToken: invalid excluded status',
  );
  assert(
    _excludedFromTax(account) != excludedStatus,
    'TransferTaxToken: same exclusion status',
  );

  EXCLUDED_FROM_TAX.set(account.toString(), excludedStatus);

  // emit ExcludedFromTaxSet(account, excludedStatus);
}

/**
 * @dev Transfers `amount` tokens from `sender` to `recipient`.
 * Overrides ERC20's transfer function to include transfer tax.
 * @param sender The sender address.
 * @param recipient The recipient address.
 * @param amount The amount to transfer.
 */
function _transfer(sender: Address, recipient: Address, amount: u256): void {
  if (sender != recipient && amount > u256.Zero) {
    if (
      u256.and(_excludedFromTax(sender), _EXCLUDED_FROM) == _EXCLUDED_FROM ||
      u256.and(_excludedFromTax(recipient), _EXCLUDED_TO) == _EXCLUDED_TO
    ) {
      super._transfer(sender, recipient, amount);
    } else {
      const taxAmount = Math512Bits.mulDivRoundDown(
        amount,
        taxRate(),
        PRECISION,
      );
      const amountAfterTax = SafeMath256.sub(amount, taxAmount);

      _transferTaxAmount(sender, taxRecipient(), taxAmount);
      if (amountAfterTax > u256.Zero)
        super._transfer(sender, recipient, amountAfterTax);
    }
  }
}

/**
 * @dev Handles the transfer of the `taxAmount` to the `recipient`.
 * If the `recipient` is the zero address, the `taxAmount` is instead burned.
 * @param sender The sender address.
 * @param recipient The tax recipient address (or zero address if burn).
 * @param taxAmount The amount to transfer as tax.
 */
function _transferTaxAmount(
  sender: Address,
  recipient: Address,
  taxAmount: u256,
): void {
  if (taxAmount > u256.Zero) {
    if (recipient == new Address('0')) _burn(sender, taxAmount);
    else super._transfer(sender, recipient, taxAmount);
  }
}
