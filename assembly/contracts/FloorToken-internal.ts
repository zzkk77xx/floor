import { IPair, Math512Bits, SafeMath256 } from '@dusalabs/core';
import {
  bytesToString,
  byteToU8,
  bytesToU16,
  bytesToU32,
  byteToBool,
} from '@massalabs/as-types';
import { Address, Context, Storage } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';
import {
  PAIR,
  STATUS,
  BIN_STEP,
  FLOOR_ID,
  ROOF_ID,
  REBALANCE_PAUSED,
} from '../storage/FloorToken';

// CLASSES

class Tuple<T, U> {
  constructor(public readonly _0: T, public readonly _1: U) {}
}

class GetAmountsInPairResult {
  constructor(
    public readonly totalFloorInPair: u256,
    public readonly totalTokenYInPair: u256,
    public readonly sharesLeftSide: u256[],
    public readonly reservesY: u256[],
  ) {}
}

// GETTERS

export function pair(): IPair {
  return new IPair(new Address(Storage.get(bytesToString(PAIR))));
}

export function status(): u8 {
  return byteToU8(Storage.get(STATUS));
}

export function binStep(): u16 {
  return bytesToU16(Storage.get(BIN_STEP));
}

export function floorId(): u32 {
  return bytesToU32(Storage.get(FLOOR_ID));
}

export function roofId(): u32 {
  return bytesToU32(Storage.get(ROOF_ID));
}

export function rebalancePaused(): bool {
  return byteToBool(Storage.get(REBALANCE_PAUSED));
}

export function range(): Tuple<u32, u32> {
  return new Tuple(floorId(), roofId());
}

export function activeId(): u32 {
  return pair().getPairInformation().activeId;
}

export function reserves(): Tuple<u256, u256> {
  const res = pair().getPairInformation();
  const reserveX = SafeMath256.sub(res.feesX.total, res.feesX.protocol);
  const reserveY = SafeMath256.sub(res.feesY.total, res.feesY.protocol);
  return new Tuple(reserveX, reserveY);
}

export function protocolFees(): Tuple<u256, u256> {
  const res = pair().getPairInformation();
  return new Tuple(res.feesX.protocol, res.feesY.protocol);
}

// FUNCTIONS

/**
 * @dev Returns the amount of token and tokenY that are in the pair contract.
 * @param floorId The id of the floor bin.
 * @param activeId The id of the active bin.
 * @param roofId The id of the roof bin.
 * @return totalFloorInPair The amount of tokens that are owned by this contract as liquidity.
 * @return totalTokenYInPair The amount of tokenY that are owned by this contract as liquidity.
 * @return sharesLeftSide The amount of shares owned by this contract as liquidity from floor to active bin.
 * @return reservesY The amount of tokenY owned by this contract as liquidity.
 */
export function _getAmountsInPair(
  floorId: u32,
  activeId: u32,
  roofId: u32,
): GetAmountsInPairResult {
  let totalFloorInPair = u256.Zero;
  let totalTokenYInPair = u256.Zero;

  // Calculate the total number of bins and the number of bins on the left side (from floor to active bin).
  const nbBins = roofId - floorId + 1;
  const nbBinsLeftSide = floorId > activeId ? 0 : activeId - floorId + 1;

  const sharesLeftSide = new Array<u256>(nbBinsLeftSide).fill(u256.Zero);
  const reservesY = new Array<u256>(nbBins).fill(u256.Zero);

  for (let i: u32 = 0; i < nbBins; i++) {
    const id = floorId + i;

    // Get the amount of shares owned by this contract, the reserves and the total supply of each bin
    const share = pair().balanceOf(Context.callee(), id);
    const binReserves = pair().getBin(id);
    const totalShares = pair().totalSupply(id);

    // The check for totalShares is implicit, as `totalShares >= share`
    if (share > u256.Zero) {
      // Calculate the amounts of tokens owned by this contract and that were added as liquidity
      const reserveX =
        binReserves.reserveX > u256.Zero
          ? Math512Bits.mulDivRoundDown(
              share,
              binReserves.reserveX,
              totalShares,
            )
          : u256.Zero;
      const reserveY =
        binReserves.reserveY > u256.Zero
          ? Math512Bits.mulDivRoundDown(
              share,
              binReserves.reserveY,
              totalShares,
            )
          : u256.Zero;

      // Update the total amounts
      totalFloorInPair = SafeMath256.add(totalFloorInPair, reserveX);
      totalTokenYInPair = SafeMath256.add(totalTokenYInPair, reserveY);

      // Update the arrays for the left side
      if (id <= activeId) {
        sharesLeftSide[i] = share;
        reservesY[i] = reserveY;
      }
    }
  }

  return new GetAmountsInPairResult(
    totalFloorInPair,
    totalTokenYInPair,
    sharesLeftSide,
    reservesY,
  );
}

export function _tokensInPair(): Tuple<u256, u256> {
  const res = _getAmountsInPair(floorId(), activeId(), roofId());
  return new Tuple(res.totalFloorInPair, res.totalTokenYInPair);
}
