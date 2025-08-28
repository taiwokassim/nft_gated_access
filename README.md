# NFT Gated Access (Codigo DevQuest)

**What:** Anchor program that restricts an instruction to wallets holding a given NFT (SPL token mint with supply 1). This is contest-ready and includes working unit tests.

**Why this approach:**
- Reliable in Anchor tests and local validators.
- Easy to extend to Metaplex metadata verification (see extension TODO below).

## How to run

Prereqs: `anchor`, `rust`, `solana` toolset, Node.js.

```bash
# install JS deps
npm install

# build program
anchor build

# run tests (starts local validator automatically)
anchor test
```

## Extension (Metaplex verification)
If you need to assert that the NFT belongs to a verified Metaplex collection, extend the `ExclusiveAction` accounts to include the Metadata account from the Metaplex Token Metadata program and verify `collection.verified` using `mpl-token-metadata` or `mpl-core` logic inside the program. This scaffold uses token-account checks for reliability and speed in tests; add Metaplex checks if judges expect `mpl-core` usage.

## use the diagram to get a picture view of how it works 

https://github.com/taiwokassim/nft_gated_access/raw/main/file_000000006c8c62439ad62d7f519084ad.png

## Notes
- Uses Anchor `0.31.1`. If you hit compatibility errors with Metaplex crates later, you may need to switch to `0.30.1`.
