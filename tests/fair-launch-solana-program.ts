import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairLaunchSolanaProgram } from "../target/types/fair_launch_solana_program";
import BN from "bn.js";

describe("fair-launch-solana-program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.FairLaunchSolanaProgram as Program<FairLaunchSolanaProgram>;

  it("configuration works", async () => {
    // Add your test here.
    const tx = await program.methods.configure({
      feeRecipient: anchor.getProvider().publicKey,
      lamportsNeededToCompleteCurve: new BN(100),
      totalTokenSupply: new BN(100),
      buyFeePercent: 100,
      sellFeePercent: 100
    }).rpc();
    console.log("Your transaction signature", tx);
  });
});
