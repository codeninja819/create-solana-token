import {
  clusterApiUrl,
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';

import {
  ExtensionType,
  createInitializeMintInstruction,
  mintTo,
  createAccount,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
  getTransferFeeAmount,
} from '@solana/spl-token';

import {
  createInitializeTransferFeeConfigInstruction,
  harvestWithheldTokensToMint,
  transferCheckedWithFee,
  withdrawWithheldTokensFromAccounts,
  withdrawWithheldTokensFromMint,
} from '@solana/spl-token';

import { readFile, writeFile } from 'fs/promises';
import { decode } from 'bs58';

import * as dotenv from 'dotenv';
dotenv.config();

import { loadSecretKey } from './utils';

const recipient = new PublicKey('7uS9TEv7dcSZKSbfGb1xpwf9AWYNk3Pk7s1z4p76xMbb');
const transferAmount = BigInt(1_000_000_000_000); // 1000 Token
const feeBasisPoints = BigInt(300);
const decimals = 9;

(async () => {
  const signer = await loadSecretKey('signer.key');
  const mintKeypair = await loadSecretKey('mint.key');
  if (!signer || !mintKeypair) {
    process.exit(1);
  }
  const mint = mintKeypair.publicKey;

  const connection = new Connection(
    clusterApiUrl(
      process.env.NODE_ENV == 'production' ? 'mainnet-beta' : 'devnet'
    ),
    'confirmed'
  );

  const sourceTokenAccounts = await connection.getTokenAccountsByOwner(
    signer.publicKey,
    { mint, programId: TOKEN_2022_PROGRAM_ID }
  );
  const sourceAccount = sourceTokenAccounts.value[0];
  const destinationTokenAccounts = await connection.getTokenAccountsByOwner(
    recipient,
    { mint, programId: TOKEN_2022_PROGRAM_ID }
  );
  let destinationAccount = destinationTokenAccounts.value?.[0]?.pubkey;
  if (!destinationAccount)
    destinationAccount = await createAccount(
      connection,
      signer,
      mint,
      recipient,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

  const fee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000);
  const txHash = await transferCheckedWithFee(
    connection,
    signer,
    sourceAccount.pubkey,
    mint,
    destinationAccount,
    signer,
    transferAmount,
    decimals,
    fee,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  console.log('Transferred successfully.');
  console.log('txHash :>> ', txHash);
})();
