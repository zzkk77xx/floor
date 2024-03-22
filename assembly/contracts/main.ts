import {
  Address,
  Context,
  balanceOf,
  createSC,
  fileToByteArray,
  generateEvent,
  transferCoins,
} from '@massalabs/massa-as-sdk';
import {
  ID_ONE,
  IERC20,
  IFactory,
  IRouter,
  ONE_COIN,
  _sortTokens,
} from '@dusalabs/core';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { IMyFloorToken } from '../interfaces/IMyFloorToken';

export function constructor(bs: StaticArray<u8>): void {
  main(bs);
}

export function main(bs: StaticArray<u8>): void {
  const router = new IRouter(
    new Address('AS1hqJGuxDdhYFg7kA1syjsPzbSBY4BG94R75NzkVw3xmRBndY4M'),
  );
  const floorWasm: StaticArray<u8> = fileToByteArray('build/MyFloorToken.wasm');
  const floorToken = new IMyFloorToken(createSC(floorWasm));
  transferCoins(floorToken._origin, 5 * ONE_COIN);

  const tokenY = new IERC20(
    new Address('AS18G57Ys9365w1j655zGzVMi9mGZ1T64D4k5kqVoXvGqBSZjW31'),
  ); // USDC
  const factory = new IFactory(
    new Address('AS12FnWgKKjv5ftKX8HsVETKVd9uUrdUPWfNhWig2ZqEt5u6UcGBA'),
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

  floorToken.floor.raiseRoof(3);

  generateEvent(floorToken._origin.toString());

  const amountIn = u256.from(u64(1000 * 10 ** tokenY.decimals()));
  const amountOutMin = u256.One;
  router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
    amountIn,
    amountOutMin,
    [binStep],
    [tokenY, floorToken.transferTax],
    Context.caller(),
    Context.timestamp(),
  );

  assert(false, 'This is a test assertion. It should never be reached.');
}
