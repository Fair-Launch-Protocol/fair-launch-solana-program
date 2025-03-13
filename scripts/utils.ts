import * as anchor from "@coral-xyz/anchor";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

const KEYPAIR_FILE_PATH = path.resolve(
  os.homedir(),
  ".config",
  "solana",
  "id.json",
);

export const createKeypairFromFile = (filePath: string) => {
  const secretKeyString = fs.readFileSync(filePath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return anchor.web3.Keypair.fromSecretKey(secretKey);
};

export const getLocalAccount = () => {
  return createKeypairFromFile(KEYPAIR_FILE_PATH);
};