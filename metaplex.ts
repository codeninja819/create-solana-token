import {
  percentAmount,
  generateSigner,
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
} from '@metaplex-foundation/umi';
import {
  TokenStandard,
  createAndMint,
  createMetadataAccountV3,
  createV1
} from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';

import { readFile, writeFile } from 'fs/promises';
import { decode } from 'bs58';
import { Keypair } from '@solana/web3.js';

import * as dotenv from 'dotenv';
dotenv.config();

import { loadSecretKey, saveSecretKey } from './utils';
import token_metadata from './token.json';

void (async function () {
  const signer = await loadSecretKey('signer.key');
  const mintKeypair = await loadSecretKey('mint.key');
  if (!signer || !mintKeypair) {
    process.exit(1);
  }
  const umi = createUmi(process.env.NODE_ENV == 'production' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com');
  const userWallet = umi.eddsa.createKeypairFromSecretKey(signer.secretKey);
  const userWalletSigner = createSignerFromKeypair(umi, userWallet);

  const SPL_TOKEN_2022_PROGRAM_ID = publicKey(
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
  );

  umi.programs.bind('splToken', 'splToken2022');
  umi.use(signerIdentity(userWalletSigner));
  umi.use(mplCandyMachine());

  createV1(umi, {
    mint: publicKey(mintKeypair.publicKey.toString()),
    name: token_metadata.name,
    symbol: token_metadata.symbol,
    decimals: 9,
    uri: "https://ipfs.io/ipfs/bafkreifgmjlkzzn2ww5w6edegswaz5amcmxofb6johz34s226b6suk6l4m",
    sellerFeeBasisPoints: percentAmount(0),
    creators: null,
    isMutable: true,
    tokenStandard: TokenStandard.Fungible,
    collection: null,
    uses: null,
    collectionDetails: null,
    ruleSet: null,
    payer: userWalletSigner,
    updateAuthority: userWalletSigner,
    splTokenProgram: SPL_TOKEN_2022_PROGRAM_ID,
  })
    .sendAndConfirm(umi)
    .then(() => {
      console.log('Successfully set metadata.');
    });


  /*
  const mint = generateSigner(umi);
  createAndMint(umi, {
    mint,
    authority: umi.identity,
    name: token_metadata.name,
    symbol: token_metadata.symbol,
    decimals: 9,
    uri: "https://ipfs.io/ipfs/bafkreifgmjlkzzn2ww5w6edegswaz5amcmxofb6johz34s226b6suk6l4m",
    sellerFeeBasisPoints: percentAmount(0),
    amount: 100_000_000_000_000,
    tokenOwner: userWallet.publicKey,
    tokenStandard: TokenStandard.Fungible,
    splTokenProgram: SPL_TOKEN_2022_PROGRAM_ID,
  })
    .sendAndConfirm(umi)
    .then(() => {
      console.log("Successfully deployed");
    });*/

})();
