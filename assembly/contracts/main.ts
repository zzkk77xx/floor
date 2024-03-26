import {
  Address,
  Context,
  call,
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
  generateEvent(Context.callee().toString());
  generateEvent(Context.caller().toString());

  const floorWasm: StaticArray<u8> = fileToByteArray('build/MyFloorToken.wasm');
  const floorToken = new IMyFloorToken(createSC(floorWasm));
  transferCoins(floorToken._origin, 15 * ONE_COIN);

  const activeId = ID_ONE;
  const binStep: u16 = 20;
  const floorPerBin = u256.from(100 * 10 ** 18);
  const tokenY = new IERC20(
    new Address('AS18G57Ys9365w1j655zGzVMi9mGZ1T64D4k5kqVoXvGqBSZjW31'),
  ); // USDC
  const factory = new IFactory(
    new Address('AS12FnWgKKjv5ftKX8HsVETKVd9uUrdUPWfNhWig2ZqEt5u6UcGBA'),
  );

  floorToken.init(
    tokenY,
    factory,
    activeId,
    binStep,
    floorPerBin,
    'MyFloorToken',
    'MFT',
  );

  floorToken.floor.raiseRoof(10);

  // const router = new IRouter(
  //   new Address('AS1hqJGuxDdhYFg7kA1syjsPzbSBY4BG94R75NzkVw3xmRBndY4M'),
  // );
  // const amountIn = u256.from(u64(300 * 10 ** tokenY.decimals()));
  // const amountOutMin = u256.One;
  // floorToken.transferTax.increaseAllowance(router._origin, amountIn);
  // tokenY.increaseAllowance(router._origin, amountIn);

  // router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
  //   amountIn,
  //   amountOutMin,
  //   [binStep],
  //   [tokenY, floorToken.transferTax],
  //   Context.caller(),
  //   Context.timestamp(),
  // );

  generateEvent(floorToken._origin.toString());
}
