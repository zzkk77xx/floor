import { Address, call } from '@massalabs/massa-as-sdk';
import { ITransferTaxToken } from './ITransferTaxToken';
import { Args, NoArg, bytesToString } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly/integer/u256';

export class ITransferDoubleTaxToken extends ITransferTaxToken {
  secondTaxRecipient(): Address {
    const res = call(this._origin, 'secondTaxRecipient', NoArg, 0);
    return new Address(bytesToString(res));
  }

  shareForSecondTaxRecipient(): u256 {
    const res = call(this._origin, 'shareForSecondTaxRecipient', NoArg, 0);
    return u256.fromBytes(res);
  }

  setSecondTaxRecipient(newSecondTaxRecipient: Address): void {
    call(
      this._origin,
      'setSecondTaxRecipient',
      new Args().add(newSecondTaxRecipient),
      0,
    );
  }

  setShareForSecondTaxRecipient(newShareForSecondTaxRecipient: u256): void {
    call(
      this._origin,
      'setShareForSecondTaxRecipient',
      new Args().add(newShareForSecondTaxRecipient),
      0,
    );
  }
}
