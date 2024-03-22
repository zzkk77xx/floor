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
  IWMAS,
  ONE_COIN,
  _sortTokens,
} from '@dusalabs/core';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { IMyFloorToken } from '../interfaces/IMyFloorToken';
import { Args } from '@massalabs/as-types';

export function constructor(bs: StaticArray<u8>): void {
  main(bs);
}

export function main(bs: StaticArray<u8>): void {
  const floorWasm: StaticArray<u8> = fileToByteArray('build/MyFloorToken.wasm');
  const floorToken = new IMyFloorToken(createSC(floorWasm));
  transferCoins(floorToken._origin, 15 * ONE_COIN);

  const binStep: u16 = 20;
  const floorPerBin = u256.from(100 * 10 ** 18);
  const tokenY = new IERC20(
    new Address('AS18G57Ys9365w1j655zGzVMi9mGZ1T64D4k5kqVoXvGqBSZjW31'),
  ); // USDC
  const wmas = new IWMAS(
    new Address('AS1LotSq7qVXma2L3EkiMjALtf9P8rCa6C4GkBhQQEYTovHQhZZY'),
  );

  const factoryWasm: StaticArray<u8> = fileToByteArray(
    '../v1-core/build/Factory.wasm',
  );
  const factory = new IFactory(createSC(factoryWasm));
  transferCoins(factory._origin, 5 * ONE_COIN);
  factory.init(
    Context.callee(),
    u256.mul(u256.from(8), u256.from(u64(10 ** 14))),
  );
  factory.addQuoteAsset(tokenY._origin);
  factory.setPreset(
    binStep,
    10_000,
    30,
    600,
    5_000,
    20_000,
    0,
    350_000,
    120_000,
  );
  call(factory._origin, 'setFactoryLockedState', new Args().add(false), 0);

  // const routerWasm: StaticArray<u8> = fileToByteArray(
  //   '../v1-core/build/Router.wasm',
  // );
  // const router = new IRouter(createSC(routerWasm));
  // transferCoins(router._origin, 5 * ONE_COIN);
  // router.init(wmas._origin, factory._origin);

  const activeId = ID_ONE;

  floorToken.init(
    tokenY,
    factory,
    activeId,
    binStep,
    floorPerBin,
    'MyFloorToken',
    'MFT',
  );
  generateEvent(floorToken._origin.toString());

  floorToken.floor.raiseRoof(10);

  // const amountIn = u256.from(u64(1000 * 10 ** tokenY.decimals()));
  // const amountOutMin = u256.One;
  // router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
  //   amountIn,
  //   amountOutMin,
  //   [binStep],
  //   [tokenY, floorToken.transferTax],
  //   Context.caller(),
  //   Context.timestamp(),
  // );

  assert(false, 'This is a test assertion. It should never be reached.');
}
