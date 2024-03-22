import { IERC20, IFactory, IRouter } from '@dusalabs/core';
import * as FT from '../contracts/FloorToken/token';
import { _tokensInPair } from '../contracts/FloorToken/token-internal';
import { Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';

const wNative = new IERC20(new Address(''));
const lbFactory = new IFactory(new Address(''));
const lbRouter = new IRouter(new Address(''));
const tokenPerBin: u256 = u256.from(100 * 10 ** 18);
const initId = 1 << 23;
const binStep = 25;
const nbBins = 10;

describe('', () => {
  test('test_TokensInPair', () => {
    const r = _tokensInPair();
    expect(r._0).toStrictEqual(u256.mul(u256.from(nbBins), tokenPerBin));
    expect(r._1).toStrictEqual(u256.Zero);
  });
});
