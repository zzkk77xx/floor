#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import asc from 'assemblyscript/dist/asc.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

async function compile(argv: string[], options: object = {}): Promise<boolean> {
  const { error, stdout, stderr } = await asc.main(argv, options);
  console.info('contract to compile ' + argv[argv.length - 1]);
  if (error) {
    console.log('Compilation failed: ' + error.message);
    console.log('stderr ' + stderr.toString());
    return Promise.resolve(false);
  } else {
    console.log(stdout.toString());
    return Promise.resolve(true);
  }
}

function searchDirectory(dir: string, fileList: string[] = []): string[] {
  readdirSync(dir).forEach((file) => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory() && file !== '__tests__') {
      fileList = searchDirectory(filePath, fileList);
    } else if (filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

/**
 * sort the file: compile deployer contract after
 *
 * @param files - files to sort
 */
function sortFiles(files: Array<string>): Array<string> {
  return files.sort((contract) => {
    return readFileSync(contract, 'utf-8').includes('fileToByteArray(')
      ? 1
      : -1;
  });
}

export async function compileAll(): Promise<boolean> {
  const dirToCompile = './assembly/contracts';
  let files: string[] = searchDirectory(dirToCompile);

  const res = await Promise.all(
    files.map((file) =>
      compile([
        '--runtime',
        'stub',
        '-o',
        join('build', basename(file.replace('.ts', '.wasm'))),
        file,
      ]),
    ),
  );

  const mainFile = 'assembly/contracts/main.ts';
  const resMain = await compile([
    '--runtime',
    'stub',
    '-o',
    join('build', basename(mainFile.replace('.ts', '.wasm'))),
    mainFile,
  ]);

  res.concat(resMain);

  return res.every((isOk) => isOk);
}

(async () => {
  await yargs(hideBin(process.argv))
    .command(
      '*',
      'Compile files in assembly/contracts',
      {},
      async (argv: any) => {
        const result = await compileAll();
        process.exit(result ? 0 : 1);
      },
    )
    .parseAsync();
})();
