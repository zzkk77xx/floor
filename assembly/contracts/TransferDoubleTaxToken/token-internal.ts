import { bytesToString, bytesToU256 } from '@massalabs/as-types';
import { Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';
import {
  SECOND_TAX_RECIPIENT,
  SHARE_FOR_SECOND_TAX_RECIPIENT,
} from '../../storage/TransferTaxDoubleToken';
import { _transferTaxAmount as super_transferTaxAmount } from '../TransferTaxToken/token-internal';
import { Math512Bits, PRECISION, SafeMath256 } from '@dusalabs/core';

export function _transferTaxAmount(
  sender: Address,
  firstTaxRecipient: Address,
  totalTaxAmount: u256,
): void {
  const amountForSecondTaxRecipient = Math512Bits.mulDivRoundDown(
    totalTaxAmount,
    shareForSecondTaxRecipient(),
    PRECISION,
  );
  const amountForFirstTaxRecipient = SafeMath256.sub(
    totalTaxAmount,
    amountForSecondTaxRecipient,
  );

  super_transferTaxAmount(
    sender,
    secondTaxRecipient(),
    amountForSecondTaxRecipient,
  );
  super_transferTaxAmount(
    sender,
    firstTaxRecipient,
    amountForFirstTaxRecipient,
  );
}

function secondTaxRecipient(): Address {
  return new Address(bytesToString(SECOND_TAX_RECIPIENT));
}

function shareForSecondTaxRecipient(): u256 {
  return bytesToU256(SHARE_FOR_SECOND_TAX_RECIPIENT);
}
