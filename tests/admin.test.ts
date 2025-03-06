import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program } from "@coral-xyz/anchor";
import { FairLaunchSolanaProgram } from "../target/types/fair_launch_solana_program";
import BN from "bn.js";
import { expect } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
  getTokenMetadata,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata"
import {getLocalAccount} from "./utils";

describe("Admin Operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.FairLaunchSolanaProgram as Program<FairLaunchSolanaProgram>;

  it("only allows the admin wallet to configure & launch", async () => {
    const connection = anchor.getProvider().connection;
    const adminKeypair = await getLocalAccount();
    const admin = anchor.getProvider().publicKey;
    const feeRecipient = new anchor.web3.PublicKey("ABMHApyZu8DfuaGoKoLk4yRHFsvzHwsEsGZXKsJ19FBX");
    const [globalConfig] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("global-config")], program.programId);
    const lamportsNeededToCompleteCurve = new BN(100);
    const totalTokenSupply = new BN(1_000_000_000).mul((new BN(10).pow(new BN(6))));
    const buyFeePercent = 1;
    const sellFeePercent = 1;
    await program.methods
      .configure({
        feeRecipient,
        lamportsNeededToCompleteCurve,
        totalTokenSupply,
        buyFeePercent,
        sellFeePercent,
      })
      .accountsStrict({
        admin,
        globalConfig,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const globalConfigAccountData = await program.account.config.fetch(globalConfig);
    expect(globalConfigAccountData.feeRecipient).to.eql(feeRecipient);
    expect(globalConfigAccountData.lamportsNeededToCompleteCurve.toNumber()).to.eql(lamportsNeededToCompleteCurve.toNumber());
    expect(globalConfigAccountData.totalTokenSupply.toNumber()).to.eql(totalTokenSupply.toNumber());
    expect(globalConfigAccountData.buyFeePercent).to.eql(buyFeePercent);
    expect(globalConfigAccountData.sellFeePercent).to.eql(sellFeePercent);

    const randomKeypair = anchor.web3.Keypair.generate();
    await program.methods
      .configure({
        feeRecipient: admin,
        lamportsNeededToCompleteCurve,
        totalTokenSupply,
        buyFeePercent,
        sellFeePercent,
      })
      .accountsStrict({
        admin: randomKeypair.publicKey,
        globalConfig,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([randomKeypair])
      .rpc()
      .then(
        () => Promise.reject(new Error("Should've thrown an address constraint error!")),
        (e: AnchorError) => {
          expect(e.errorLogs).includes('Program log: AnchorError caused by account: admin. Error Code: ConstraintAddress. Error Number: 2012. Error Message: An address constraint was violated.');
        }
      );

    const tokenName = "aTokenName";
    const tokenSymbol = "aTOKSYM";
    const tokenUri = "https://aTokenUri"
    const tokenMintKeypair = anchor.web3.Keypair.generate();
    const tokenMint = tokenMintKeypair.publicKey;
    const [tokenMetadataAccount] = anchor.web3.PublicKey
      .findProgramAddressSync([
          Buffer.from('metadata', 'utf8'),
          new anchor.web3.PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBytes(),
          tokenMint.toBytes(),
        ],
        new anchor.web3.PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID),
      );
    // const tokenMetadataAccount = anchor.web3.Keypair.generate().publicKey;
    const [bondingCurve] = anchor.web3.PublicKey.findProgramAddressSync([tokenMint.toBuffer()], program.programId);
    const curveTokenAccount = getAssociatedTokenAddressSync(
      tokenMint,
      bondingCurve,
      true
    );
    const launchHash = await program.methods
      .launch(tokenName, tokenSymbol, tokenUri)
      .accountsStrict({
        admin,
        globalConfig,
        tokenMint,
        bondingCurve,
        curveTokenAccount,
        tokenMetadataAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        metadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([tokenMintKeypair, adminKeypair])
      .rpc();
    console.log(`Token launched at tx: ${launchHash}, token mint account: ${tokenMint.toString()}`)

    const tokenMintAccountInfo = await getMint(connection, tokenMint);
    expect(tokenMintAccountInfo.isInitialized).to.be.true
    expect(tokenMintAccountInfo.decimals).to.equal(6);
    expect(tokenMintAccountInfo.supply.toString()).to.equal(totalTokenSupply.toString());

    const userTokenAccount = getAssociatedTokenAddressSync(tokenMint, admin);

    const feeRecipientBalanceBeforeBuyTx = await connection.getBalance(feeRecipient);
    const buyAmountInLamports = 0.1 * anchor.web3.LAMPORTS_PER_SOL;
    const buyHash = await program.methods
      .swap(
        new BN(buyAmountInLamports),
        true,
      )
      .accountsStrict({
        user: admin,
        feeRecipient,
        userTokenAccount,
        globalConfig,
        tokenMint,
        bondingCurve,
        curveTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([adminKeypair])
      .rpc();
    console.log(`Buy tx: ${buyHash}`);
    const feeRecipientAfterBuyTx = await connection.getBalance(feeRecipient)
    expect(feeRecipientAfterBuyTx).to.equal(feeRecipientBalanceBeforeBuyTx + (buyAmountInLamports * 0.01));
  });
});
