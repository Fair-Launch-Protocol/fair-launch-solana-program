import { web3 } from '@coral-xyz/anchor';
import {feeRecipient, globalConfig, program} from "./constants";
import {ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import BN from "bn.js";
import {getLocalAccount} from "./utils";

const deriveBondingCurve = (mint: web3.PublicKey) => web3.PublicKey.findProgramAddressSync(
  [mint.toBuffer()],
  program.programId
);

const buyToken = async (mintAddress: string, amount: number) => {
  const tokenMint = new web3.PublicKey(mintAddress);
  const localUser = getLocalAccount();
  const [bondingCurve, _bondingCurveBump] = deriveBondingCurve(tokenMint);
  const curveTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    bondingCurve,
    true,
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    localUser.publicKey,
    false,
  );
  const buyHash = await program.methods
    .swap(
      new BN(amount),
      true,
    )
    .accountsStrict({
      user: localUser.publicKey,
      feeRecipient,
      userTokenAccount,
      globalConfig,
      tokenMint,
      bondingCurve,
      curveTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([localUser])
    .rpc();
  console.log(`Token bought at tx: https://explorer.sonic.game/tx/${buyHash}`);
};

buyToken("672P6S3dgDbgVnBDfamcxoNUUeHBNetR45xTPDrt1hEH", 100);

