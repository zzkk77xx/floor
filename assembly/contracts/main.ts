import {
  Address,
  Context,
  createSC,
  fileToByteArray,
  generateEvent,
  transferCoins,
} from '@massalabs/massa-as-sdk';
import {
  ID_ONE,
  IERC20,
  IFactory,
  ONE_COIN,
  _sortTokens,
} from '@dusalabs/core';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { IMyFloorToken } from '../interfaces/IMyFloorToken';

export function constructor(bs: StaticArray<u8>): void {
  main(bs);
}

export function main(bs: StaticArray<u8>): void {
  const floorWasm: StaticArray<u8> = fileToByteArray('build/MyFloorToken.wasm');
  const floorToken = new IMyFloorToken(createSC(floorWasm));
  generateEvent(floorToken._origin.toString());
  transferCoins(floorToken._origin, 5 * ONE_COIN);

  const tokenY = new IERC20(
    new Address('AS1sKBEGsqtm8vQhQzi7KJ4YhyaKTSkhJrLkRc7mQtPqme3VcFHm'),
  ); // USDC
  const factory = new IFactory(
    new Address('AS12o8B3xPdY7a9ZbedwxRStLQAiDqp531LR7fChwqhkhfR3rurCB'),
  );
  const binStep: u16 = 20;
  const floorPerBin = u256.from(100);

  const tokens = _sortTokens(floorToken._origin, tokenY._origin);

  const activeIdDiff: u32 = 2651;
  const activeId =
    tokens.token0 == tokenY._origin
      ? ID_ONE + activeIdDiff
      : ID_ONE - activeIdDiff;

  floorToken.init(
    tokenY,
    factory,
    activeId,
    binStep,
    floorPerBin,
    'MyFloorToken',
    'MFT',
  );
  generateEvent(floorToken.transferTax.balanceOf(Context.caller()).toString());
  generateEvent(floorToken.transferTax.taxRate().toString());

  assert(false, 'This is a test assertion. It should never be reached.');
}
