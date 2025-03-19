import { web3 } from '@coral-xyz/anchor';
import {feeRecipient, globalConfig, program} from "./constants";
import {ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import BN from "bn.js";
import {getLocalAccount} from "./utils";
import * as anchor from "@coral-xyz/anchor";
import {MPL_TOKEN_METADATA_PROGRAM_ID} from "@metaplex-foundation/mpl-token-metadata";

const deriveBondingCurve = (mint: web3.PublicKey) => web3.PublicKey.findProgramAddressSync(
  [mint.toBuffer()],
  program.programId
);

const launchToken = async (name: string, symbol: string, uri: string) => {
  const tokenMintKeypair = anchor.web3.Keypair.generate();
  const tokenMint = tokenMintKeypair.publicKey;
  const localUser = getLocalAccount();
  const [tokenMetadataAccount] = anchor.web3.PublicKey
    .findProgramAddressSync([
        Buffer.from('metadata', 'utf8'),
        new anchor.web3.PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBytes(),
        tokenMint.toBytes(),
      ],
      new anchor.web3.PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID),
    );
  const [bondingCurve, _bondingCurveBump] = deriveBondingCurve(tokenMint);
  const curveTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    bondingCurve,
    true,
  );
  const launchHash = await program.methods
    .launch(
      name,
      symbol,
      uri,
    )
    .accountsStrict({
      admin: localUser.publicKey,
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
    .signers([localUser, tokenMintKeypair])
    .rpc();
  console.log(`Token launched at tx: https://explorer.sonic.game/tx/${launchHash}, mint address: ${tokenMint.toString()}`);
};

launchToken("Bald Solana Guy", "MERT", "");

