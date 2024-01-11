
import { readFile, writeFile } from 'fs/promises';
import { decode } from 'bs58';
import { Keypair } from '@solana/web3.js';

export async function loadSecretKey(filename: string): Promise<Keypair | undefined> {
  try {
    const data = (await readFile('secrets/' + filename)).toString();
    let secretKey;
    try {
      const keyArray = JSON.parse(data);
      secretKey = new Uint8Array(keyArray);
    } catch (e) {
      secretKey = decode(data);
    }
    return Keypair.fromSecretKey(secretKey);
  }
  catch (e) {
    console.log(e);
    console.log(`Please setup ${filename} in secrets folder`);
  }
}

export async function saveSecretKey(keypair: Keypair, filename: string) {
  try {
    await writeFile('secrets/' + filename, `[${keypair.secretKey.toString()}]`);
  } catch (e) {
    console.log(e);
  }
}
