import { IERC20, IFactory, IPair } from '@dusalabs/core';
import {
  Args,
  NoArg,
  byteToBool,
  bytesToString,
  bytesToU16,
  bytesToU256,
} from '@massalabs/as-types';
import { Address, call } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';

export class IFloorToken {
  constructor(public _origin: Address) {}

  pair(): IPair {
    const res = call(this._origin, 'pair', NoArg, 0);
    return new IPair(new Address(bytesToString(res)));
  }

  tokenY(): IERC20 {
    const res = call(this._origin, 'tokenY', NoArg, 0);
    return new IERC20(new Address(bytesToString(res)));
  }

  binStep(): u16 {
    const res = call(this._origin, 'binStep', NoArg, 0);
    return bytesToU16(res);
  }

  floorPerBin(): u256 {
    const res = call(this._origin, 'floorPerBin', NoArg, 0);
    return bytesToU256(res);
  }

  floorPrice(): u256 {
    const res = call(this._origin, 'floorPrice', NoArg, 0);
    return bytesToU256(res);
  }

  //  range(): (uint24, uint24);

  rebalancePaused(): bool {
    const res = call(this._origin, 'rebalancePaused', NoArg, 0);
    return byteToBool(res);
  }

  //  tokensInPair(): (uint256, uint256);

  //  calculateNewFloorId(): (uint24);

  //  rebalanceFloor() external;

  //  raiseRoof(uint24 nbBins) external;

  //  reduceRoof(uint24 nbBins) external;

  //  pauseRebalance() external;

  //  unpauseRebalance() external;
}
