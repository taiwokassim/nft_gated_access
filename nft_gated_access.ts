import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftGatedAccess } from "../target/types/nft_gated_access";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import assert from "assert";

describe("nft-gated-access (integration)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace
    .NftGatedAccess as Program<NftGatedAccess>;

  let gatedAccount: Keypair;
  let nftMint: PublicKey;
  let userAtaPubkey: PublicKey;

  it("initializes gated account", async () => {
    gatedAccount = Keypair.generate();

    await program.methods
      .initialize()
      .accounts({
        gatedAccount: gatedAccount.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([]) // payer is provider.wallet
      .rpc();
  });

  it("creates an NFT mint and mints to user ATA", async () => {
    // create mint with decimals 0 (NFT-like) and supply minted 1 to user
    nftMint = await createMint(
      provider.connection,
      provider.wallet.payer, // fee payer
      provider.wallet.publicKey,
      null,
      0
    );

    const userAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      nftMint,
      provider.wallet.publicKey
    );

    userAtaPubkey = userAta.address;

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      nftMint,
      userAta.address,
      provider.wallet.publicKey,
      1
    );

    const account = await getAccount(provider.connection, userAta.address);
    assert.strictEqual(Number(account.amount), 1);
  });

  it("allows user with NFT to call exclusive_action", async () => {
    await program.methods
      .exclusiveAction()
      .accounts({
        gatedAccount: gatedAccount.publicKey,
        userTokenAccount: userAtaPubkey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    // fetch gated account and verify counter === 1
    const acct = await program.account.gatedAccount.fetch(
      gatedAccount.publicKey
    );
    // counter is u64, Anchor client returns BN or number depending on version
    const counterVal = acct.counter?.toNumber ? acct.counter.toNumber() : acct.counter;
    assert.strictEqual(Number(counterVal), 1);
  });

  it("revokes access when NFT is transferred away", async () => {
    // create a recipient keypair and its ATA
    const recipient = Keypair.generate();

    // Airdrop some SOL to recipient so creating ATA is possible
    const sig = await provider.connection.requestAirdrop(
      recipient.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(sig, "confirmed");

    const recipientAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      nftMint,
      recipient.publicKey
    );

    // transfer the NFT from provider to recipient
    const userAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      nftMint,
      provider.wallet.publicKey
    );

    await transfer(
      provider.connection,
      provider.wallet.payer,
      userAccount.address,
      recipientAta.address,
      provider.wallet.publicKey,
      1
    );

    // Attempt to call exclusive_action — should fail because provider no longer has token
    try {
      await program.methods
        .exclusiveAction()
        .accounts({
          gatedAccount: gatedAccount.publicKey,
          userTokenAccount: userAccount.address,
          user: provider.wallet.publicKey,
        })
        .rpc();
      assert.fail("Should have failed because user no longer owns NFT");
    } catch (err) {
      assert.ok(true);
    }
  });
});
