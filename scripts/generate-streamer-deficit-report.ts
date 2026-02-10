#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";

type StreamVersion = "v1" | "v2";
type ClaimAsset = "USDC" | "USD" | "UNKNOWN";

interface StreamTarget {
  readonly address: string;
  readonly vendor: string;
  readonly version: StreamVersion;
}

interface ClaimTotals {
  readonly totalComp: bigint;
  readonly totalNative: bigint;
}

interface ReportRow {
  readonly address: string;
  readonly vendor: string;
  readonly claimAsset: ClaimAsset;
  readonly claimedAmount: string;
  readonly compBalance: string;
  readonly availableToClaimComp: string;
  readonly availableToClaimNative: string;
  readonly streamFinishTs: string;
  readonly streamFinishUtc: string;
  readonly budgetForDays: string;
  readonly daysDeficit: string;
  readonly requiredTopUp: string;
  readonly avgClaimCompPrice: string;
}

const COMP_TOKEN_ADDRESS = "0xc00e94cb662c3520282e6f5717214004a7f26888";
const USDC_ORACLE_ADDRESS = "0x8fffffd4afb6115b954bd326cbE7b4ba576818f6".toLowerCase();
const USD_CONSTANT_ORACLE_ADDRESS = "0xd72ac1bce9177cfe7aeb5d0516a38c88a64ce0ab".toLowerCase();

const STREAMS: ReadonlyArray<StreamTarget> = [
  {
    address: "0xF088339DD8e79819A41aDD5FFB75d9F245AfaAb1",
    vendor: "Woof Software",
    version: "v1",
  },
  {
    address: "0x334791289a906Ac8f96ac0f90E7A91Bf4AaE4A60",
    vendor: "SSP",
    version: "v2",
  },
  {
    address: "0xAF9CEE006AE377e88f3BBd668e3d67807F546Bd8",
    vendor: "ZeroShadow",
    version: "v2",
  },
  {
    address: "0x36a0eB84154797DAdCEaCFD046785dB31094C308",
    vendor: "Tally",
    version: "v2",
  },
  {
    address: "0xEA2B6BC719CF6D2Fed07865d26987D32d570DbBD",
    vendor: "Gauntlet",
    version: "v2",
  },
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const entries: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }

  return entries;
}

function getEnvVar(name: string, fileEnv: Record<string, string>): string {
  const value = process.env[name] ?? fileEnv[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function maxBigInt(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

function decimalFromRatio(
  numerator: bigint,
  denominator: bigint,
  precision: number = 6
): string {
  if (denominator === 0n) {
    return "0";
  }
  const sign = numerator < 0n !== denominator < 0n ? "-" : "";
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = denominator < 0n ? -denominator : denominator;

  const integerPart = absNum / absDen;
  const remainder = absNum % absDen;
  const scale = 10n ** BigInt(precision);
  const fractional = (remainder * scale) / absDen;
  let fractionalText = fractional.toString().padStart(precision, "0");
  fractionalText = fractionalText.replace(/0+$/, "");
  if (!fractionalText) {
    return `${sign}${integerPart.toString()}`;
  }
  return `${sign}${integerPart.toString()}.${fractionalText}`;
}

function formatTokenAmount(value: bigint, decimals: number): string {
  return ethers.formatUnits(value, decimals);
}

function formatUnixTs(ts: bigint): { ts: string; utc: string } {
  if (ts === 0n) {
    return { ts: "0", utc: "not initialized" };
  }
  const date = new Date(Number(ts) * 1000);
  return { ts: ts.toString(), utc: date.toISOString() };
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: ReadonlyArray<ReportRow>): string {
  const header = [
    "address",
    "vendor",
    "claim asset",
    "claimed amount",
    "comp balance",
    "Available to claim COMP",
    "available to claim",
    "Stream finishes ts",
    "Stream finishes utc",
    "Budget for days",
    "Days deficit",
    "Required top up",
    "Avg claim COMP price",
  ];

  const dataRows = rows.map((row) =>
    [
      row.address,
      row.vendor,
      row.claimAsset,
      row.claimedAmount,
      row.compBalance,
      row.availableToClaimComp,
      row.availableToClaimNative,
      row.streamFinishTs,
      row.streamFinishUtc,
      row.budgetForDays,
      row.daysDeficit,
      row.requiredTopUp,
      row.avgClaimCompPrice,
    ]
      .map((v) => escapeCsv(v))
      .join(",")
  );

  return [header.join(","), ...dataRows].join("\n") + "\n";
}

async function findBlockByTimestamp(
  provider: ethers.JsonRpcProvider,
  targetTimestamp: number
): Promise<number> {
  if (targetTimestamp <= 0) {
    return 0;
  }

  const latestNumber = await provider.getBlockNumber();
  const latestBlock = await provider.getBlock(latestNumber);
  if (!latestBlock) {
    return 0;
  }
  if (targetTimestamp >= latestBlock.timestamp) {
    return latestNumber;
  }

  let low = 0;
  let high = latestNumber;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const block = await provider.getBlock(mid);
    if (!block) {
      high = mid - 1;
      continue;
    }
    if (block.timestamp <= targetTimestamp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
}

async function getClaimTotals(
  provider: ethers.JsonRpcProvider,
  address: string,
  version: StreamVersion,
  iface: ethers.Interface,
  fromBlock: number
): Promise<ClaimTotals> {
  const topic = iface.getEvent("Claimed").topicHash;
  const latestBlock = await provider.getBlockNumber();

  let totalComp = 0n;
  let totalNative = 0n;
  const step = 9_000;

  for (let from = fromBlock; from <= latestBlock; from += step) {
    const to = Math.min(from + step - 1, latestBlock);
    const logs = await provider.getLogs({
      address,
      topics: [topic],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      const parsed = iface.parseLog(log);
      if (!parsed) {
        continue;
      }
      if (version === "v1") {
        totalComp += parsed.args.compAmount as bigint;
        totalNative += parsed.args.usdcAmount as bigint;
      } else {
        totalComp += parsed.args.streamingAssetAmount as bigint;
        totalNative += parsed.args.nativeAssetAmount as bigint;
      }
    }
  }

  return { totalComp, totalNative };
}

async function buildV1Row(
  provider: ethers.JsonRpcProvider,
  compToken: ethers.Contract,
  target: StreamTarget,
  v1Abi: ethers.InterfaceAbi,
  nowTs: bigint
): Promise<ReportRow> {
  const contract = new ethers.Contract(target.address, v1Abi, provider);
  const iface = contract.interface;

  const [streamAmount, streamDuration, startTimestamp, suppliedAmount, owedNative] =
    (await Promise.all([
      contract.STREAM_AMOUNT(),
      contract.STREAM_DURATION(),
      contract.startTimestamp(),
      contract.suppliedAmount(),
      contract.getAmountOwed(),
    ])) as [bigint, bigint, bigint, bigint, bigint];

  const [compBalanceRaw, compNeededRaw] = (await Promise.all([
    compToken.balanceOf(target.address),
    owedNative > 0n ? contract.calculateCompAmount(owedNative) : Promise.resolve(0n),
  ])) as [bigint, bigint];

  const claimableComp = minBigInt(compBalanceRaw, compNeededRaw);
  let claimableNative = owedNative;
  if (compBalanceRaw < compNeededRaw) {
    claimableNative = (await contract.calculateUsdcAmount(compBalanceRaw)) as bigint;
  }

  const nativeFromBalance =
    compBalanceRaw > 0n ? ((await contract.calculateUsdcAmount(compBalanceRaw)) as bigint) : 0n;
  const streamEnd = startTimestamp === 0n ? 0n : startTimestamp + streamDuration;
  const remainingSeconds = streamEnd > nowTs ? streamEnd - nowTs : 0n;
  const effectiveTotalNative = streamAmount;
  const remainingRequiredNative = maxBigInt(effectiveTotalNative - suppliedAmount, 0n);
  const budgetSeconds =
    effectiveTotalNative > 0n ? (nativeFromBalance * streamDuration) / effectiveTotalNative : 0n;
  const daysDeficitSeconds =
    remainingSeconds > budgetSeconds ? remainingSeconds - budgetSeconds : 0n;
  const requiredTopUp = maxBigInt(remainingRequiredNative - nativeFromBalance, 0n);

  const startSearchTs = startTimestamp > 86_400n ? Number(startTimestamp - 86_400n) : 0;
  const fromBlock = await findBlockByTimestamp(provider, startSearchTs);
  const claimTotals = await getClaimTotals(
    provider,
    target.address,
    "v1",
    iface,
    fromBlock
  );

  const avgPrice =
    claimTotals.totalComp === 0n
      ? "0"
      : decimalFromRatio(
          claimTotals.totalNative * 10n ** 18n,
          claimTotals.totalComp * 10n ** 6n,
          6
        );

  const finish = formatUnixTs(streamEnd);
  return {
    address: target.address,
    vendor: target.vendor,
    claimAsset: "USDC",
    claimedAmount: formatTokenAmount(suppliedAmount, 6),
    compBalance: formatTokenAmount(compBalanceRaw, 18),
    availableToClaimComp: formatTokenAmount(claimableComp, 18),
    availableToClaimNative: formatTokenAmount(claimableNative, 6),
    streamFinishTs: finish.ts,
    streamFinishUtc: finish.utc,
    budgetForDays: decimalFromRatio(budgetSeconds, 86_400n, 4),
    daysDeficit: decimalFromRatio(daysDeficitSeconds, 86_400n, 4),
    requiredTopUp: formatTokenAmount(requiredTopUp, 6),
    avgClaimCompPrice: avgPrice,
  };
}

async function buildV2Row(
  provider: ethers.JsonRpcProvider,
  compToken: ethers.Contract,
  target: StreamTarget,
  v2Abi: ethers.InterfaceAbi,
  nowTs: bigint
): Promise<ReportRow> {
  const contract = new ethers.Contract(target.address, v2Abi, provider);
  const iface = contract.interface;

  const [
    streamingAsset,
    nativeAssetOracle,
    nativeAssetStreamingAmount,
    nativeAssetSuppliedAmount,
    streamDuration,
    streamEnd,
    startTimestamp,
    nativeAssetDecimals,
    owedNative,
    streamingAssetDecimals,
  ] = (await Promise.all([
    contract.streamingAsset(),
    contract.nativeAssetOracle(),
    contract.nativeAssetStreamingAmount(),
    contract.nativeAssetSuppliedAmount(),
    contract.streamDuration(),
    contract.getStreamEnd(),
    contract.startTimestamp(),
    contract.nativeAssetDecimals(),
    contract.getNativeAssetAmountOwed(),
    contract.streamingAssetDecimals(),
  ])) as [string, string, bigint, bigint, bigint, bigint, bigint, number, bigint, number];

  const [streamingAssetBalance, compBalanceRaw, compNeededRaw] = (await Promise.all([
    new ethers.Contract(streamingAsset, ERC20_ABI, provider).balanceOf(target.address),
    compToken.balanceOf(target.address),
    owedNative > 0n ? contract.calculateStreamingAssetAmount(owedNative) : Promise.resolve(0n),
  ])) as [bigint, bigint, bigint];

  const claimableComp = minBigInt(streamingAssetBalance, compNeededRaw);
  let claimableNative = owedNative;
  if (streamingAssetBalance < compNeededRaw) {
    claimableNative = (await contract.calculateNativeAssetAmount(streamingAssetBalance)) as bigint;
  }

  const nativeFromBalance =
    streamingAssetBalance > 0n
      ? ((await contract.calculateNativeAssetAmount(streamingAssetBalance)) as bigint)
      : 0n;

  let effectiveTotalNative = nativeAssetStreamingAmount;
  if (startTimestamp > 0n && streamEnd > 0n && streamEnd < startTimestamp + streamDuration) {
    effectiveTotalNative = (nativeAssetStreamingAmount * (streamEnd - startTimestamp)) / streamDuration;
  }

  const remainingRequiredNative = maxBigInt(effectiveTotalNative - nativeAssetSuppliedAmount, 0n);
  const remainingSeconds = streamEnd > nowTs ? streamEnd - nowTs : 0n;
  const budgetSeconds =
    nativeAssetStreamingAmount > 0n
      ? (nativeFromBalance * streamDuration) / nativeAssetStreamingAmount
      : 0n;
  const daysDeficitSeconds =
    remainingSeconds > budgetSeconds ? remainingSeconds - budgetSeconds : 0n;
  const requiredTopUp = maxBigInt(remainingRequiredNative - nativeFromBalance, 0n);

  const startSearchTs = startTimestamp > 86_400n ? Number(startTimestamp - 86_400n) : 0;
  const fromBlock = await findBlockByTimestamp(provider, startSearchTs);
  const claimTotals = await getClaimTotals(
    provider,
    target.address,
    "v2",
    iface,
    fromBlock
  );
  const avgPrice =
    claimTotals.totalComp === 0n
      ? "0"
      : decimalFromRatio(
          claimTotals.totalNative * 10n ** 18n,
          claimTotals.totalComp * 10n ** BigInt(nativeAssetDecimals),
          6
        );

  const oracle = normalizeAddress(nativeAssetOracle);
  const claimAsset: ClaimAsset =
    oracle === USDC_ORACLE_ADDRESS
      ? "USDC"
      : oracle === USD_CONSTANT_ORACLE_ADDRESS
        ? "USD"
        : "UNKNOWN";

  const finish = formatUnixTs(streamEnd);
  const streamingIsComp = normalizeAddress(streamingAsset) === normalizeAddress(COMP_TOKEN_ADDRESS);
  return {
    address: target.address,
    vendor: target.vendor,
    claimAsset,
    claimedAmount: formatTokenAmount(nativeAssetSuppliedAmount, nativeAssetDecimals),
    compBalance: formatTokenAmount(compBalanceRaw, 18),
    availableToClaimComp: streamingIsComp
      ? formatTokenAmount(claimableComp, streamingAssetDecimals)
      : "n/a (streaming asset is not COMP)",
    availableToClaimNative: formatTokenAmount(claimableNative, nativeAssetDecimals),
    streamFinishTs: finish.ts,
    streamFinishUtc: finish.utc,
    budgetForDays: decimalFromRatio(budgetSeconds, 86_400n, 4),
    daysDeficit: decimalFromRatio(daysDeficitSeconds, 86_400n, 4),
    requiredTopUp: formatTokenAmount(requiredTopUp, nativeAssetDecimals),
    avgClaimCompPrice: avgPrice,
  };
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, ".env");
  const fileEnv = parseEnvFile(envPath);
  const rpcMainnet = getEnvVar("RPC_MAINNET", fileEnv);

  const provider = new ethers.JsonRpcProvider(rpcMainnet);
  const compToken = new ethers.Contract(COMP_TOKEN_ADDRESS, ERC20_ABI, provider);
  const nowTs = BigInt(Math.floor(Date.now() / 1000));

  const v1Abi = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "streamer.v1.json"), "utf8")
  ) as ethers.InterfaceAbi;
  const v2Abi = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "streamer.v2.json"), "utf8")
  ) as ethers.InterfaceAbi;

  const rows: ReportRow[] = [];
  for (const target of STREAMS) {
    const row =
      target.version === "v1"
        ? await buildV1Row(provider, compToken, target, v1Abi, nowTs)
        : await buildV2Row(provider, compToken, target, v2Abi, nowTs);
    rows.push(row);
  }

  const output = toCsv(rows);
  const outputPath = path.join(projectRoot, "streamer-deficit-report.csv");
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Created report: ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to generate streamer deficit report: ${message}`);
  process.exit(1);
});
