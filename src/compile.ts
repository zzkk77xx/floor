#!/usr/bin/env node
import { readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
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

export async function compileAll(): Promise<boolean> {
  const dirToCompile = './assembly/contracts';
  let files: string[] = searchDirectory(dirToCompile);

  const res = await Promise.all(
    files.map((file) =>
      compile([
        '--runtime',
        'stub',
        '-o',
        join(
          'build',
          basename(dirname(file)) !== 'contracts'
            ? basename(dirname(file))
            : '',
          basename(file.replace('.ts', '.wasm')),
        ),
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
