import { Args, stringToBytes, u256ToBytes } from '@massalabs/as-types';
import {
  Address,
  Storage,
  createEvent,
  generateEvent,
} from '@massalabs/massa-as-sdk';
import * as Ownable from '@massalabs/sc-standards/assembly/contracts/utils/ownership';
import { PRECISION } from '@dusalabs/core';
import {
  SECOND_TAX_RECIPIENT,
  SHARE_FOR_SECOND_TAX_RECIPIENT,
} from '../../storage/TransferTaxDoubleToken';

export * from '../TransferTaxToken/token';

export function setSecondTaxRecipient(bs: StaticArray<u8>): void {
  Ownable.onlyOwner();

  const newSecondTaxRecipient = new Address(
    new Args(bs)
      .nextString()
      .expect('newSecondTaxRecipient is missing or invalid'),
  );
  Storage.set(
    SECOND_TAX_RECIPIENT,
    stringToBytes(newSecondTaxRecipient.toString()),
  );

  const event = createEvent('SECOND_TAX_RECIPIENT_SET', [
    newSecondTaxRecipient.toString(),
  ]);
  generateEvent(event);
}

export function setShareForSecondTaxRecipient(bs: StaticArray<u8>): void {
  Ownable.onlyOwner();

  const newShareForSecondTaxRecipient = new Args(bs)
    .nextU256()
    .expect('newShareForSecondTaxRecipient is missing or invalid');
  assert(
    newShareForSecondTaxRecipient <= PRECISION,
    'TransferDoubleTaxToken: invalid share',
  );
  Storage.set(
    SHARE_FOR_SECOND_TAX_RECIPIENT,
    u256ToBytes(newShareForSecondTaxRecipient),
  );

  const event = createEvent('SHARE_FOR_SECOND_TAX_RECIPIENT_SET', [
    newShareForSecondTaxRecipient.toString(),
  ]);
  generateEvent(event);
}
