import { IERC20, IFactory, IPair } from '@dusalabs/core';
import {
  Args,
  NoArg,
  byteToBool,
  bytesToString,
  bytesToU256,
  bytesToU32,
} from '@massalabs/as-types';
import { Address, Storage, call } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { Tuple } from '../libraries/Utils';
import { FLOOR_ID, REBALANCE_PAUSED, ROOF_ID } from '../storage/FloorToken';

export class IFloorToken {
  constructor(public _origin: Address) {}

  floorId(): u32 {
    return bytesToU32(Storage.getOf(this._origin, FLOOR_ID));
  }

  roofId(): u32 {
    return bytesToU32(Storage.getOf(this._origin, ROOF_ID));
  }

  pair(): IPair {
    const res = call(this._origin, 'pair', NoArg, 0);
    return new IPair(new Address(bytesToString(res)));
  }

  tokenY(): IERC20 {
    const res = call(this._origin, 'tokenY', NoArg, 0);
    return new IERC20(new Address(bytesToString(res)));
  }

  binStep(): u32 {
    const res = call(this._origin, 'binStep', NoArg, 0);
    return bytesToU32(res);
  }

  floorPerBin(): u256 {
    const res = call(this._origin, 'floorPerBin', NoArg, 0);
    return bytesToU256(res);
  }

  floorPrice(): u256 {
    const res = call(this._origin, 'floorPrice', NoArg, 0);
    return bytesToU256(res);
  }

  rebalancePaused(): bool {
    return byteToBool(Storage.getOf(this._origin, REBALANCE_PAUSED));
  }

  tokensInPair(): Tuple<u256, u256> {
    const res = new Args(call(this._origin, 'tokensInPair', NoArg, 0));
    return new Tuple<u256, u256>(
      res.nextU256().unwrap(),
      res.nextU256().unwrap(),
    );
  }

  calculateNewFloorId(): u32 {
    const res = call(this._origin, 'calculateNewFloorId', NoArg, 0);
    return bytesToU32(res);
  }

  rebalanceFloor(): void {
    call(this._origin, 'rebalanceFloor', NoArg, 0);
  }

  raiseRoof(nbBins: u32): void {
    call(this._origin, 'raiseRoof', new Args().add(nbBins), 0);
  }

  reduceRoof(nbBins: u32): void {
    call(this._origin, 'reduceRoof', new Args().add(nbBins), 0);
  }

  pauseRebalance(): void {
    call(this._origin, 'pauseRebalance', NoArg, 0);
  }

  unpauseRebalance(): void {
    call(this._origin, 'unpauseRebalance', NoArg, 0);
  }
}
