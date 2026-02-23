import type { HardhatUserConfig } from "hardhat/config";
import { task, types } from "hardhat/config";
import "@nomicfoundation/hardhat-network-helpers";
import * as fs from "fs";
import * as path from "path";

function loadEnvVar(name: string): string | undefined {
  // Try process.env first
  if (process.env[name]) return process.env[name];

  // Fall back to .env file
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return undefined;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === name) return value;
  }
  return undefined;
}

const rpcMainnet = loadEnvVar("RPC_MAINNET") ?? "";

task("report", "Generate streamer deficit report")
  .addOptionalParam(
    "block",
    "Pin report to a specific historical block number",
    undefined,
    types.int
  )
  .setAction(async (taskArgs: { block?: number }, hre) => {
    const { runReport } =
      await import("./scripts/generate-streamer-deficit-report");
    await runReport(hre, taskArgs.block);
  });

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        url: rpcMainnet,
        enabled: true,
      },
    },
  },
};

export default config;
