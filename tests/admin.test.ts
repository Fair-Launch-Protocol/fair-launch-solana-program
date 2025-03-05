import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program } from "@coral-xyz/anchor";
import { FairLaunchSolanaProgram } from "../target/types/fair_launch_solana_program";
import BN from "bn.js";
import { expect } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata"
import {getLocalAccount} from "./utils";

describe("Admin Operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.FairLaunchSolanaProgram as Program<FairLaunchSolanaProgram>;

  it("only allows the admin wallet to configure & launch", async () => {
    const adminKeypair = await getLocalAccount();
    const admin = anchor.getProvider().publicKey;
    const [globalConfig] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("global-config")], program.programId);
    const lamportsNeededToCompleteCurve = new BN(100);
    const totalTokenSupply = new BN(100);
    const buyFeePercent = 100;
    const sellFeePercent = 100;
    await program.methods
      .configure({
        feeRecipient: admin,
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
    expect(globalConfigAccountData.feeRecipient).to.eql(admin);
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
    await program.methods
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
  });
});
