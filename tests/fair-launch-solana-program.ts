import * as anchor from "@coral-xyz/anchor";
import {AnchorError, Program} from "@coral-xyz/anchor";
import { FairLaunchSolanaProgram } from "../target/types/fair_launch_solana_program";
import BN from "bn.js";
import {expect} from "chai";

describe("fair-launch-solana-program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.FairLaunchSolanaProgram as Program<FairLaunchSolanaProgram>;

  it("only sets configuration with the admin wallet", async () => {
    // Add your test here.
    const feeRecipient = anchor.getProvider().publicKey;
    const [globalConfig, _] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("global-config")], program.programId);
    const lamportsNeededToCompleteCurve = new BN(100);
    const totalTokenSupply = new BN(100);
    const buyFeePercent = 100;
    const sellFeePercent = 100;
    await program.methods
      .configure({
        feeRecipient,
        lamportsNeededToCompleteCurve,
        totalTokenSupply,
        buyFeePercent,
        sellFeePercent,
      })
      .accountsStrict({
        admin: anchor.getProvider().publicKey,
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
          feeRecipient,
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
  });
});
