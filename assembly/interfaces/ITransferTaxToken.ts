import { IERC20 } from '@dusalabs/core';
import { Args, NoArg, bytesToString, bytesToU256 } from '@massalabs/as-types';
import { Address, Storage, call } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { TAX_RATE, TAX_RECIPIENT } from '../storage/TransferTaxToken';

export class ITransferTaxToken extends IERC20 {
  taxRecipient(): Address {
    return new Address(
      bytesToString(Storage.getOf(this._origin, TAX_RECIPIENT)),
    );
  }

  taxRate(): u256 {
    return bytesToU256(Storage.getOf(this._origin, TAX_RATE));
  }

  excludedFromTax(account: Address): u256 {
    return bytesToU256(
      call(this._origin, 'excludedFromTax', new Args().add(account), 0),
    );
  }

  setTaxRate(taxRate: u256): void {
    call(this._origin, 'setTaxRate', new Args().add(taxRate), 0);
  }

  setTaxRecipient(taxRecipient: Address): void {
    call(this._origin, 'setTaxRecipient', new Args().add(taxRecipient), 0);
  }

  setExcludedFromTax(account: Address, excludedStatus: u256): void {
    call(
      this._origin,
      'setExcludedFromTax',
      new Args().add(account).add(excludedStatus),
      0,
    );
  }
}
