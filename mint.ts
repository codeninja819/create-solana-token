import {
  percentAmount,
  generateSigner,
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
} from "@metaplex-foundation/umi"
import {
  TokenStandard,
  createAndMint,
  createFungible,
  createFungibleAsset,
  createMetadataAccountV3,
} from "@metaplex-foundation/mpl-token-metadata"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import secret from "./signer.json"
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine"

const umi = createUmi("https://api.devnet.solana.com")
const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret))
const userWalletSigner = createSignerFromKeypair(umi, userWallet)

const SPL_TOKEN_2022_PROGRAM_ID = publicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
);

const metadata = {
  name: "Wales Token",
  symbol: "WLT",
  uri: "https://ipfs.io/ipfs/bafkreifgmjlkzzn2ww5w6edegswaz5amcmxofb6johz34s226b6suk6l4m",
}

const mint = generateSigner(umi)
umi.programs.bind('splToken', 'splToken2022');
umi.use(signerIdentity(userWalletSigner))
umi.use(mplCandyMachine());

/*createAndMint(umi, {
  mint,
  authority: umi.identity,
  name: metadata.name,
  symbol: metadata.symbol,
  uri: metadata.uri,
  sellerFeeBasisPoints: percentAmount(0),
  decimals: 8,
  amount: 100_000_000_000_000,
  tokenOwner: userWallet.publicKey,
  tokenStandard: TokenStandard.Fungible,
  splTokenProgram: SPL_TOKEN_2022_PROGRAM_ID,
})
  .sendAndConfirm(umi)
  .then(() => {
    console.log("Successfully deployed")
  })
*/
createMetadataAccountV3(umi, {
  //accounts
  // metadata: metadataAccount,
  mint: userWalletSigner.publicKey,
  mintAuthority: userWalletSigner,
  payer: userWalletSigner,
  updateAuthority: userWalletSigner,
  // & instruction data
  data: {
    name: "myname",
    symbol: "exp",
    uri: "example_uri.com",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
  },
  isMutable: true,
  collectionDetails: null,

}).sendAndConfirm(umi)
  .then((res) => {
    console.log("Successfully deployed")
    console.log('res :>> ', res);
  })