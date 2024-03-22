import {
  PRECISION,
  Math512Bits,
  SafeMath256,
  createEvent,
} from '@dusalabs/core';
import {
  bytesToString,
  bytesToU256,
  stringToBytes,
  u256ToBytes,
} from '@massalabs/as-types';
import { Address, Storage, generateEvent } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';
import {
  EXCLUDED_FROM_TAX,
  TAX_RECIPIENT,
  TAX_RATE,
  _EXCLUDED_BOTH,
  _EXCLUDED_FROM,
  _EXCLUDED_TO,
} from '../storage/TransferTaxToken';
import { _burn } from '@massalabs/sc-standards/assembly/contracts/FT/burnable/burn-internal';
import { super_transfer } from './ERC20/token-internal';

export function _excludedFromTax(account: Address): u256 {
  return EXCLUDED_FROM_TAX.getSome(account.toString());
}

export function _setTaxRecipient(newTaxRecipient: Address): void {
  Storage.set(TAX_RECIPIENT, stringToBytes(newTaxRecipient.toString()));

  const event = createEvent('TAX_RECIPIENT_SET', [newTaxRecipient.toString()]);
  generateEvent(event);
}

export function _setTaxRate(newTaxRate: u256): void {
  assert(newTaxRate <= PRECISION, 'TransferTaxToken: tax rate exceeds 100%');

  // SafeCast is not needed here since the tax rate is bound by PRECISION, which is strictly less than 2**96.
  Storage.set(TAX_RATE, u256ToBytes(newTaxRate));

  const event = createEvent('TAX_RATE_SET', [newTaxRate.toString()]);
  generateEvent(event);
}

export function _setExcludedFromTax(
  account: Address,
  excludedStatus: u256,
): void {
  assert(
    excludedStatus <= _EXCLUDED_BOTH,
    'TransferTaxToken: invalid excluded status',
  );
  assert(
    _excludedFromTax(account) != excludedStatus,
    'TransferTaxToken: same exclusion status',
  );

  EXCLUDED_FROM_TAX.set(account.toString(), excludedStatus);

  const event = createEvent('EXCLUDED_FROM_TAX_SET', [
    account.toString(),
    excludedStatus.toString(),
  ]);
  generateEvent(event);
}

/**
 * @dev Transfers `amount` tokens from `sender` to `recipient`.
 * Overrides ERC20's transfer function to include transfer tax.
 * @param sender The sender address.
 * @param recipient The recipient address.
 * @param amount The amount to transfer.
 */
export function _transfer(
  sender: Address,
  recipient: Address,
  amount: u256,
): void {
  if (sender != recipient && amount > u256.Zero) {
    if (
      u256.and(_excludedFromTax(sender), _EXCLUDED_FROM) == _EXCLUDED_FROM ||
      u256.and(_excludedFromTax(recipient), _EXCLUDED_TO) == _EXCLUDED_TO
    ) {
      super_transfer(sender, recipient, amount);
    } else {
      const taxAmount = Math512Bits.mulDivRoundDown(
        amount,
        taxRate(),
        PRECISION,
      );
      const amountAfterTax = SafeMath256.sub(amount, taxAmount);

      _transferTaxAmount(sender, taxRecipient(), taxAmount);
      if (amountAfterTax > u256.Zero) {
        super_transfer(sender, recipient, amountAfterTax);
      }
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
export function _transferTaxAmount(
  sender: Address,
  recipient: Address,
  taxAmount: u256,
): void {
  if (taxAmount > u256.Zero) {
    if (recipient == new Address('0')) _burn(sender, taxAmount);
    else _transfer(sender, recipient, taxAmount);
  }
}

function taxRecipient(): Address {
  return new Address(bytesToString(Storage.get(TAX_RECIPIENT)));
}

function taxRate(): u256 {
  return bytesToU256(Storage.get(TAX_RATE));
}
