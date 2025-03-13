import * as anchor from '@coral-xyz/anchor';
import { getLocalAccount } from "./utils";
import idl from '../target/idl/fair_launch_solana_program.json';
import { FairLaunchSolanaProgram } from '../target/types/fair_launch_solana_program';

const connection = new anchor.web3.Connection("https://rpc.mainnet-alpha.sonic.game");

const localKeypair = getLocalAccount();

export const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(localKeypair),
  anchor.AnchorProvider.defaultOptions(),
);

export const program = new anchor.Program(
  idl as unknown as anchor.Idl,
  provider,
) as unknown as anchor.Program<FairLaunchSolanaProgram>;

export const feeRecipient = new anchor.web3.PublicKey("ABMHApyZu8DfuaGoKoLk4yRHFsvzHwsEsGZXKsJ19FBX"); // always the same (defined in config)

export const [globalConfig] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("global-config")], program.programId);

