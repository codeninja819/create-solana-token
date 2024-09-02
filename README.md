# Create SPL 2022 token and set Metaplex metadata for the token.

1. Create signer.key file in secret folder and paste wallet private key.
2. Edit token.json.
3. Upload token.json to IPFS.
4. Update uri at metaplex.ts:L46.
5. Edit tokenomics at deploy.ts:L35-38.
6. npx ts-node deploy.ts
7. npx ts-node metaplex.ts
