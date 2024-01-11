import {
  clusterApiUrl,
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
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

(async () => {
  const signer = await loadSecretKey('signer.key');
  const mintKeypair = await loadSecretKey('mint.key');
  if (!signer || !mintKeypair) {
    process.exit(1);
  }
  const mint = mintKeypair.publicKey;
  const withdrawWithheldAuthority = signer;

  const connection = new Connection(clusterApiUrl(process.env.NODE_ENV == 'production' ? 'mainnet-beta' : 'devnet'), 'confirmed');

  // find withheld accounts
  const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    commitment: 'confirmed',
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: mint.toString(),
        },
      },
    ],
  });
  const accountsToWithdrawFrom = [];
  let totalWithheldAmount = BigInt(0);
  for (const accountInfo of allAccounts) {
    const account = unpackAccount(accountInfo.pubkey, accountInfo.account, TOKEN_2022_PROGRAM_ID);
    const transferFeeAmount = getTransferFeeAmount(account);
    if (transferFeeAmount !== null && transferFeeAmount.withheldAmount > BigInt(0)) {
      accountsToWithdrawFrom.push(accountInfo.pubkey);
      totalWithheldAmount += transferFeeAmount.withheldAmount;
    }
  }

  // withdraw
  const tokenAccounts = await connection.getTokenAccountsByOwner(signer.publicKey, { mint, programId: TOKEN_2022_PROGRAM_ID });
  const feeCollectionAccount = tokenAccounts.value[0];
  if (totalWithheldAmount > BigInt(0)) {
    const txHash = await withdrawWithheldTokensFromAccounts(
      connection,
      signer,
      mint,
      feeCollectionAccount.pubkey,
      withdrawWithheldAuthority,
      [],
      accountsToWithdrawFrom,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log('Fee collected successfully.');
    console.log('txHash :>> ', txHash);
    console.log('total fee collected :>> ', totalWithheldAmount);
  }
  else {
    console.log('No fee to collect.');
  }
})();