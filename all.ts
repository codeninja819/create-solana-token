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

async function loadSecretKey(filename: string): Promise<Keypair | undefined> {
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

async function saveSecretKey(keypair: Keypair, filename: string) {
  try {
    await writeFile('secrets/' + filename, `[${keypair.secretKey.toString()}]`);
  } catch (e) {
    console.log(e);
  }
}

(async () => {
  const signer = await loadSecretKey('signer.key');
  const dev2 = await loadSecretKey('dev2.key');
  if (!signer || !dev2) {
    process.exit(1);
  }
  // const payer = Keypair.generate();
  const payer = signer;
  const mintAuthority = signer;
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const transferFeeConfigAuthority = signer;
  const withdrawWithheldAuthority = signer;
  saveSecretKey(mintKeypair, 'mint.key');
  // saveKeypair(payer, 'payer.txt');
  // saveKeypair(mintAuthority, 'mintAuthority.txt');
  // saveKeypair(mintKeypair, 'mintKeypair.txt');
  // saveKeypair(transferFeeConfigAuthority, 'transferFeeConfigAuthority.txt');
  // saveKeypair(withdrawWithheldAuthority, 'withdrawWithheldAuthority.txt');

  const extensions = [ExtensionType.TransferFeeConfig];

  const mintLen = getMintLen(extensions);
  const decimals = 9;
  const feeBasisPoints = 300;
  const maxSupply = BigInt(1_000_000_000_000_000_000);
  const maxFee = maxSupply;

  const connection = new Connection(clusterApiUrl(process.env.NODE_ENV == 'production' ? 'mainnet-beta' : 'devnet'), 'confirmed');

  // const airdropSignature = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
  // await connection.confirmTransaction({ signature: airdropSignature, ...(await connection.getLatestBlockhash()) });

  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint,
      transferFeeConfigAuthority.publicKey,
      withdrawWithheldAuthority.publicKey,
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(mint, decimals, mintAuthority.publicKey, null, TOKEN_2022_PROGRAM_ID)
  );
  await sendAndConfirmTransaction(connection, mintTransaction, [payer, mintKeypair], undefined);

  // mint token
  const mintAmount = maxSupply;
  const signerTokenAccount = await createAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log('signerTokenAccount :>> ', signerTokenAccount);
  await mintTo(
    connection,
    payer,
    mint,
    signerTokenAccount,
    mintAuthority,
    mintAmount,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  // transfer
  const destinationAccount = await createAccount(
    connection,
    payer,
    mint,
    dev2.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log('destinationAccount :>> ', destinationAccount);

  const transferAmount = BigInt(1_000_000_000_000);
  const fee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000);
  await transferCheckedWithFee(
    connection,
    payer,
    signerTokenAccount,
    mint,
    destinationAccount,
    payer,
    transferAmount,
    decimals,
    fee,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

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
  for (const accountInfo of allAccounts) {
    const account = unpackAccount(accountInfo.pubkey, accountInfo.account, TOKEN_2022_PROGRAM_ID);
    const transferFeeAmount = getTransferFeeAmount(account);
    if (transferFeeAmount !== null && transferFeeAmount.withheldAmount > BigInt(0)) {
      accountsToWithdrawFrom.push(accountInfo.pubkey);
    }
  }

  // withdraw
  await withdrawWithheldTokensFromAccounts(
    connection,
    payer,
    mint,
    signerTokenAccount,
    withdrawWithheldAuthority,
    [],
    accountsToWithdrawFrom,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
})();