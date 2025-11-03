import {
  createSC,
  fileToByteArray,
  generateEvent,
  transferCoins,
  createEvent,
  Context,
  call,
} from '@massalabs/massa-as-sdk';
import { Args } from '@massalabs/as-types';
import { IMyFloorToken } from '../interfaces/IMyFloorToken';
import { IERC20 } from '@dusalabs/core';
import { IFactory } from '@dusalabs/core';
import { Address } from '@massalabs/massa-as-sdk';

const ONE_COIN = u64(10 ** 9);

export function constructor(): void {
  // This is the deployer contract, so we don't need to do anything here
}

export function deploy(bs: StaticArray<u8>): void {
  const floorWasm: StaticArray<u8> = fileToByteArray('build/MyFloorToken.wasm');
  const myFloor = new IMyFloorToken(createSC(floorWasm));
  transferCoins(myFloor._origin, 11 * ONE_COIN); // 10 to create LB pair + 1 to pay fees

  const args = new Args(bs);

  // floor token args
  const tokenY = args.nextString().unwrap();
  const factory = args.nextString().unwrap();
  const activeId = args.nextU32().unwrap();
  const binStep = args.nextU32().unwrap();
  const floorPerBin = args.nextU256().unwrap();

  // transfer tax token args
  const name = args.nextString().unwrap();
  const symbol = args.nextString().unwrap();
  const decimals = args.nextU8().unwrap();
  const initialSupply = args.nextU256().unwrap();
  const taxRate = args.nextU256().unwrap();
  const taxRecipientBs = args.nextString();
  const taxRecipient = taxRecipientBs.isOk()
    ? new Address(taxRecipientBs.unwrap())
    : new Address('0');

  myFloor.init(
    new IERC20(new Address(tokenY)),
    new IFactory(new Address(factory)),
    activeId,
    binStep,
    floorPerBin,
    name,
    symbol,
    decimals,
    initialSupply,
    taxRate,
    taxRecipient,
  );

  call(
    myFloor._origin,
    'setOwner',
    new Args().add(Context.caller().toString()),
    0,
  );

  generateEvent(createEvent('NEW_FLOOR', [myFloor._origin.toString()]));
}
