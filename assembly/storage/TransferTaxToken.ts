import { PersistentMap } from '@dusalabs/core';
import { stringToBytes } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly/integer/u256';

/**
 * @dev The exclusion status of accounts from transfer tax. Each new status must be a power of 2.
 * This is done so that statuses that are a combination of other statuses are easily checkable with
 * bitwise operations and do not require iteration.
 */
export const _EXCLUDED_NONE: u256 = u256.Zero; // 0b0000
export const _EXCLUDED_FROM: u256 = u256.shl(u256.One, 0); // 0b0001
export const _EXCLUDED_TO: u256 = u256.shl(u256.One, 1); // 0b0010
export const _EXCLUDED_BOTH: u256 = u256.or(_EXCLUDED_FROM, _EXCLUDED_TO); // 0b0011

/**
 * @dev The recipient and rate of the transfer tax.
 */
export const TAX_RECIPIENT = stringToBytes('taxRecipient');
export const TAX_RATE = stringToBytes('taxRate');

/**
 * @dev The exclusion status of accounts from transfer tax.
 */
export const EXCLUDED_FROM_TAX = new PersistentMap<string, u256>(
  'excludedFromTax',
);
