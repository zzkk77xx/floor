import * as dotenv from 'dotenv';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { getEnvVariable } from './utils';
import { deploySC, WalletClient, ISCData } from '@massalabs/massa-sc-deployer';
import {
  Args,
  fromMAS,
  MAX_GAS_DEPLOYMENT,
  CHAIN_ID,
  DefaultProviderUrls,
  MassaUnits,
} from '@massalabs/massa-web3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

dotenv.config();

const IS_BUILDNET = true;
const publicApi = IS_BUILDNET
  ? DefaultProviderUrls.BUILDNET
  : DefaultProviderUrls.MAINNET;
const secretKey = getEnvVariable('WALLET_SECRET_KEY');
const chainId = IS_BUILDNET ? CHAIN_ID.BuildNet : CHAIN_ID.MainNet;
const maxGas = MAX_GAS_DEPLOYMENT;
const fees = MassaUnits.oneMassa / 100n;
const waitFirstEvent = true;

const deployerAccount = await WalletClient.getAccountFromSecretKey(secretKey);

// https://docs.dusa.io/deployment-addresses
const WMAS = IS_BUILDNET
  ? 'AS12FW5Rs5YN2zdpEnqwj4iHUUPt9R4Eqjq2qtpJFNKW3mn33RuLU'
  : '';
const FACTORY = IS_BUILDNET
  ? 'AS12w3vcEYn8VBX1utw1fSmFNbYv9vMvy5n8tqCJjoGz3vaQYEhfp'
  : 'AS127Lxdux4HCUkZL89SrRYR5kq2u8t64Jt3aYj786t6fBF1cZGcu';
const activeId = 8378237; // 1 with decimalsX = 18 and decimalsY = 9
const binStep = 20;
const PRECISION = 1_000_000_000_000_000_000n;
const floorPerBin = 100n * PRECISION;

(async () => {
  await deploySC(
    publicApi,
    deployerAccount,
    [
      // {
      //   data: readFileSync(path.join(__dirname, 'build', 'main.wasm')),
      //   coins: fromMAS(50),
      // },
      {
        data: readFileSync(path.join(__dirname, 'build', 'MyFloorToken.wasm')),
        coins: fromMAS(50),
        args: new Args()
          .addString(WMAS)
          .addString(FACTORY)
          .addU32(activeId)
          .addU32(binStep)
          .addU256(floorPerBin)
          .addString('My Floor Token')
          .addString('FLOOR')
          .addU8(18) // decimals
          .addU256(0n) // initial supply
          .addU256(PRECISION / 20n), // tax rate (5%)
      },
    ],
    chainId,
    fees,
    maxGas,
    waitFirstEvent,
  );
  process.exit(0);
})();
