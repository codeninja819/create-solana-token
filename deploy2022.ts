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

import * as dotenv from 'dotenv';
dotenv.config();

import { loadSecretKey, saveSecretKey } from './utils';

const decimals = 9;
const feeBasisPoints = 300; // 3%
const maxSupply = BigInt(1_000_000_000_000_000_000); // 1B token
const maxFee = maxSupply;

(async () => {
  const signer = await loadSecretKey('signer.key');
  if (!signer) {
    process.exit(1);
  }
  const mintAuthority = signer;
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const transferFeeConfigAuthority = signer;
  const withdrawWithheldAuthority = signer;
  saveSecretKey(mintKeypair, 'mint.key');

  const connection = new Connection(clusterApiUrl(process.env.NODE_ENV == 'production' ? 'mainnet-beta' : 'devnet'), 'confirmed');

  // deploy token
  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: signer.publicKey,
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
  await sendAndConfirmTransaction(connection, mintTransaction, [signer, mintKeypair], undefined);

  // mint
  const mintAmount = maxSupply;
  const tokenAccount = await createAccount(
    connection,
    signer,
    mint,
    signer.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  await mintTo(
    connection,
    signer,
    mint,
    tokenAccount,
    mintAuthority,
    mintAmount,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  console.log('Token deployed & minted');
  console.log('Token address :>> ', mint.toString());
})();