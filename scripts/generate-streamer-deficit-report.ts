#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

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
  readonly usdValueCannotBeClaimedStreaming: string;
  readonly streamFinishTs: string;
  readonly streamFinishUtc: string;
  readonly budgetForDays: string;
  readonly daysDeficit: string;
  readonly requiredTopUp: string;
  readonly totalBudget: string;
  readonly avgClaimCompPrice: string;
  readonly compPriceNative: string;
  readonly remainingStreamTimeSec: string;
  readonly remainingStreamTimeAfterSimSec: string;
  readonly remainingUsd: string;
  readonly remainingUsdAfterClaim567k: string;
}

/** Overrides passed to every view / pure contract call (empty = latest). */
type ViewOverrides = { blockTag?: number };

const COMP_TOKEN_ADDRESS = "0xc00e94cb662c3520282e6f5717214004a7f26888";
const USDC_ORACLE_ADDRESS = "0x8fffffd4afb6115b954bd326cbE7b4ba576818f6".toLowerCase();
const USD_CONSTANT_ORACLE_ADDRESS = "0xd72ac1bce9177cfe7aeb5d0516a38c88a64ce0ab".toLowerCase();

/** Number of seconds to advance time before simulating a claim. */
const SIMULATION_TIME_ADVANCE = 567_000;

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
    "Address",
    "Vendor",
    "Claim asset",
    "Claimed ($)",
    "COMP balance",
    "Available to claim (COMP)",
    "Available to claim ($)",
    "Unclaimable streaming ($)",
    "Stream end (timestamp)",
    "Stream end (UTC)",
    "Budget (days)",
    "Deficit (days)",
    "Required top-up ($)",
    "Total budget ($)",
    "Avg COMP price ($)",
    "COMP price ($)",
    "Remaining Stream Time (s)",
    `Remaining Stream Time after +${SIMULATION_TIME_ADVANCE}s (s)`,
    "Remaining ($)",
    `Remaining after claim +${SIMULATION_TIME_ADVANCE}s ($)`,
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
      row.usdValueCannotBeClaimedStreaming,
      row.streamFinishTs,
      row.streamFinishUtc,
      row.budgetForDays,
      row.daysDeficit,
      row.requiredTopUp,
      row.totalBudget,
      row.avgClaimCompPrice,
      row.compPriceNative,
      row.remainingStreamTimeSec,
      row.remainingStreamTimeAfterSimSec,
      row.remainingUsd,
      row.remainingUsdAfterClaim567k,
    ]
      .map((v) => escapeCsv(v))
      .join(",")
  );

  return [header.join(","), ...dataRows].join("\n") + "\n";
}

async function findBlockByTimestamp(
  provider: ethers.JsonRpcProvider,
  targetTimestamp: number,
  ceilingBlock?: number,
): Promise<number> {
  if (targetTimestamp <= 0) {
    return 0;
  }

  const latestNumber = ceilingBlock ?? await provider.getBlockNumber();
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
  fromBlock: number,
  ceilingBlock?: number,
): Promise<ClaimTotals> {
  const claimedEvent = iface.getEvent("Claimed");
  if (!claimedEvent) {
    return { totalComp: 0n, totalNative: 0n };
  }
  const topic = claimedEvent.topicHash;
  const latestBlock = ceilingBlock ?? await provider.getBlockNumber();

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

/**
 * Simulate a claim on a Hardhat-forked network after advancing time by
 * `SIMULATION_TIME_ADVANCE` seconds.  Returns the remaining USD
 * (totalBudget − claimed) that would result after the simulated claim.
 *
 * For v1: remaining = streamAmount − suppliedAmountAfterClaim (in USDC, 6 dec)
 * For v2: remaining = effectiveTotalNative − nativeAssetSuppliedAmountAfterClaim
 */
async function simulateClaimAfterDelay(
  target: StreamTarget,
  abi: ethers.InterfaceAbi,
  rpcUrl: string,
  hre: HardhatRuntimeEnvironment,
  forkBlock?: number,
): Promise<bigint> {
  // Reset the Hardhat fork so every simulation starts from the live (or pinned) state
  const forkingParams: Record<string, unknown> = { jsonRpcUrl: rpcUrl };
  if (forkBlock !== undefined) {
    forkingParams.blockNumber = forkBlock;
  }
  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [{ forking: forkingParams }],
  });

  const hhProvider = new ethers.BrowserProvider(hre.network.provider);
  const iface = new ethers.Interface(abi as string[]);

  const contract = new ethers.Contract(target.address, abi, hhProvider);

  // Determine who is allowed to call claim()
  const caller: string =
    target.version === "v1"
      ? await contract.receiver()
      : await contract.recipient();

  // Advance time
  await hre.network.provider.send("evm_increaseTime", [SIMULATION_TIME_ADVANCE]);
  await hre.network.provider.send("evm_mine", []);

  // Impersonate the caller
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [caller],
  });

  // Fund the impersonated account with ETH for gas
  await hre.network.provider.send("hardhat_setBalance", [
    caller,
    "0x56BC75E2D63100000", // 100 ETH
  ]);

  // Execute claim via raw eth_sendTransaction (avoids eth_requestAccounts)
  const claimData = iface.encodeFunctionData("claim");
  const txHash = (await hre.network.provider.request({
    method: "eth_sendTransaction",
    params: [{ from: caller, to: target.address, data: claimData }],
  })) as string;

  // Wait for receipt
  let receipt = null;
  while (!receipt) {
    receipt = await hhProvider.getTransactionReceipt(txHash);
  }

  // Stop impersonating
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [caller],
  });

  // Read post-claim supplied amount
  if (target.version === "v1") {
    const [streamAmount, suppliedAfter] = (await Promise.all([
      contract.STREAM_AMOUNT(),
      contract.suppliedAmount(),
    ])) as [bigint, bigint];
    return maxBigInt(streamAmount - suppliedAfter, 0n);
  } else {
    const [nativeAssetStreamingAmount, nativeAssetSuppliedAfter, streamDuration, streamEnd, startTimestamp] =
      (await Promise.all([
        contract.nativeAssetStreamingAmount(),
        contract.nativeAssetSuppliedAmount(),
        contract.streamDuration(),
        contract.getStreamEnd(),
        contract.startTimestamp(),
      ])) as [bigint, bigint, bigint, bigint, bigint];

    let effectiveTotalNative = nativeAssetStreamingAmount;
    if (startTimestamp > 0n && streamEnd > 0n && streamEnd < startTimestamp + streamDuration) {
      effectiveTotalNative =
        (nativeAssetStreamingAmount * (streamEnd - startTimestamp)) / streamDuration;
    }
    return maxBigInt(effectiveTotalNative - nativeAssetSuppliedAfter, 0n);
  }
}

async function buildV1Row(
  provider: ethers.JsonRpcProvider,
  compToken: ethers.Contract,
  target: StreamTarget,
  v1Abi: ethers.InterfaceAbi,
  nowTs: bigint,
  rpcUrl: string,
  hre: HardhatRuntimeEnvironment,
  overrides: ViewOverrides = {},
): Promise<ReportRow> {
  const contract = new ethers.Contract(target.address, v1Abi, provider);
  const iface = contract.interface;

  const [streamAmount, streamDuration, startTimestamp, suppliedAmount, owedNative] =
    (await Promise.all([
      contract.STREAM_AMOUNT(overrides),
      contract.STREAM_DURATION(overrides),
      contract.startTimestamp(overrides),
      contract.suppliedAmount(overrides),
      contract.getAmountOwed(overrides),
    ])) as [bigint, bigint, bigint, bigint, bigint];

  const [compBalanceRaw, compNeededRaw] = (await Promise.all([
    compToken.balanceOf(target.address, overrides),
    owedNative > 0n ? contract.calculateCompAmount(owedNative, overrides) : Promise.resolve(0n),
  ])) as [bigint, bigint];

  const claimableComp = minBigInt(compBalanceRaw, compNeededRaw);
  let claimableNative = owedNative;
  if (compBalanceRaw < compNeededRaw) {
    claimableNative = (await contract.calculateUsdcAmount(compBalanceRaw, overrides)) as bigint;
  }

  const nativeFromBalance =
    compBalanceRaw > 0n ? ((await contract.calculateUsdcAmount(compBalanceRaw, overrides)) as bigint) : 0n;
  const streamEnd = startTimestamp === 0n ? 0n : startTimestamp + streamDuration;
  const remainingSeconds = streamEnd > nowTs ? streamEnd - nowTs : 0n;
  const effectiveTotalNative = streamAmount;
  const remainingRequiredNative = maxBigInt(effectiveTotalNative - suppliedAmount, 0n);
  const budgetSeconds =
    effectiveTotalNative > 0n ? (nativeFromBalance * streamDuration) / effectiveTotalNative : 0n;
  const daysDeficitSeconds =
    remainingSeconds > budgetSeconds ? remainingSeconds - budgetSeconds : 0n;
  const requiredTopUp = maxBigInt(remainingRequiredNative - nativeFromBalance, 0n);

  // p1: remaining stream in native from now to end
  const p1 =
    streamDuration > 0n
      ? (streamAmount * remainingSeconds) / streamDuration
      : 0n;
  // p2: COMP that cannot be claimed now (balance - owed in COMP terms)
  const p2 = compNeededRaw > 0n ? maxBigInt(compBalanceRaw - compNeededRaw, 0n) : compBalanceRaw;
  // p3: native value of p2
  const p3 = p2 > 0n ? ((await contract.calculateUsdcAmount(p2, overrides)) as bigint) : 0n;
  const unclaimableStreamingNative = minBigInt(p1, p3);

  const totalBudgetRaw =
    suppliedAmount + claimableNative + unclaimableStreamingNative + requiredTopUp;

  const startSearchTs = startTimestamp > 86_400n ? Number(startTimestamp - 86_400n) : 0;
  const fromBlock = await findBlockByTimestamp(provider, startSearchTs, overrides.blockTag);
  const claimTotals = await getClaimTotals(
    provider,
    target.address,
    "v1",
    iface,
    fromBlock,
    overrides.blockTag,
  );

  const avgPrice =
    claimTotals.totalComp === 0n
      ? "0"
      : decimalFromRatio(
          claimTotals.totalNative * 10n ** 18n,
          claimTotals.totalComp * 10n ** 6n,
          6
        );

  const oneComp = 10n ** 18n;
  const compPriceNativeRaw =
    (await contract.calculateUsdcAmount(oneComp, overrides)) as bigint;
  const compPriceNative = formatTokenAmount(compPriceNativeRaw, 6);

  const finish = formatUnixTs(streamEnd);

  // Remaining USD = total budget − already claimed
  const remainingUsdRaw = maxBigInt(streamAmount - suppliedAmount, 0n);

  // Simulate claim after SIMULATION_TIME_ADVANCE seconds on a Hardhat fork
  console.log(`  [v1/${target.vendor}] simulating claim after ${SIMULATION_TIME_ADVANCE}s …`);
  const remainingAfterSim = await simulateClaimAfterDelay(target, v1Abi, rpcUrl, hre, overrides.blockTag);

  return {
    address: target.address,
    vendor: target.vendor,
    claimAsset: "USDC",
    claimedAmount: formatTokenAmount(suppliedAmount, 6),
    compBalance: formatTokenAmount(compBalanceRaw, 18),
    availableToClaimComp: formatTokenAmount(claimableComp, 18),
    availableToClaimNative: formatTokenAmount(claimableNative, 6),
    usdValueCannotBeClaimedStreaming: formatTokenAmount(unclaimableStreamingNative, 6),
    streamFinishTs: finish.ts,
    streamFinishUtc: finish.utc,
    budgetForDays: decimalFromRatio(budgetSeconds, 86_400n, 4),
    daysDeficit: decimalFromRatio(daysDeficitSeconds, 86_400n, 4),
    requiredTopUp: formatTokenAmount(requiredTopUp, 6),
    totalBudget: formatTokenAmount(totalBudgetRaw, 6),
    avgClaimCompPrice: avgPrice,
    compPriceNative,
    remainingStreamTimeSec: remainingSeconds.toString(),
    remainingStreamTimeAfterSimSec: (streamEnd > nowTs + BigInt(SIMULATION_TIME_ADVANCE)
      ? streamEnd - nowTs - BigInt(SIMULATION_TIME_ADVANCE)
      : 0n
    ).toString(),
    remainingUsd: formatTokenAmount(remainingUsdRaw, 6),
    remainingUsdAfterClaim567k: formatTokenAmount(remainingAfterSim, 6),
  };
}

async function buildV2Row(
  provider: ethers.JsonRpcProvider,
  compToken: ethers.Contract,
  target: StreamTarget,
  v2Abi: ethers.InterfaceAbi,
  nowTs: bigint,
  rpcUrl: string,
  hre: HardhatRuntimeEnvironment,
  overrides: ViewOverrides = {},
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
    contract.streamingAsset(overrides),
    contract.nativeAssetOracle(overrides),
    contract.nativeAssetStreamingAmount(overrides),
    contract.nativeAssetSuppliedAmount(overrides),
    contract.streamDuration(overrides),
    contract.getStreamEnd(overrides),
    contract.startTimestamp(overrides),
    contract.nativeAssetDecimals(overrides),
    contract.getNativeAssetAmountOwed(overrides),
    contract.streamingAssetDecimals(overrides),
  ])) as [string, string, bigint, bigint, bigint, bigint, bigint, number, bigint, number];

  const [streamingAssetBalance, compBalanceRaw, compNeededRaw] = (await Promise.all([
    new ethers.Contract(streamingAsset, ERC20_ABI, provider).balanceOf(target.address, overrides),
    compToken.balanceOf(target.address, overrides),
    owedNative > 0n ? contract.calculateStreamingAssetAmount(owedNative, overrides) : Promise.resolve(0n),
  ])) as [bigint, bigint, bigint];

  const claimableComp = minBigInt(streamingAssetBalance, compNeededRaw);
  let claimableNative = owedNative;
  if (streamingAssetBalance < compNeededRaw) {
    claimableNative = (await contract.calculateNativeAssetAmount(streamingAssetBalance, overrides)) as bigint;
  }

  const nativeFromBalance =
    streamingAssetBalance > 0n
      ? ((await contract.calculateNativeAssetAmount(streamingAssetBalance, overrides)) as bigint)
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

  // p1: remaining stream in native from now to end
  const p1 =
    streamDuration > 0n
      ? (nativeAssetStreamingAmount * remainingSeconds) / streamDuration
      : 0n;
  // p2: streaming asset that cannot be claimed now (balance - owed in streaming asset terms)
  const p2 =
    compNeededRaw > 0n
      ? maxBigInt(streamingAssetBalance - compNeededRaw, 0n)
      : streamingAssetBalance;
  // p3: native value of p2
  const p3 =
    p2 > 0n ? ((await contract.calculateNativeAssetAmount(p2, overrides)) as bigint) : 0n;
  const unclaimableStreamingNative = minBigInt(p1, p3);

  const totalBudgetRaw =
    nativeAssetSuppliedAmount +
    claimableNative +
    unclaimableStreamingNative +
    requiredTopUp;

  const startSearchTs = startTimestamp > 86_400n ? Number(startTimestamp - 86_400n) : 0;
  const fromBlock = await findBlockByTimestamp(provider, startSearchTs, overrides.blockTag);
  const claimTotals = await getClaimTotals(
    provider,
    target.address,
    "v2",
    iface,
    fromBlock,
    overrides.blockTag,
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

  const streamingIsComp = normalizeAddress(streamingAsset) === normalizeAddress(COMP_TOKEN_ADDRESS);
  const oneComp = 10n ** 18n;
  const compPriceNativeRaw = streamingIsComp
    ? ((await contract.calculateNativeAssetAmount(oneComp, overrides)) as bigint)
    : 0n;
  const compPriceNative = streamingIsComp
    ? formatTokenAmount(compPriceNativeRaw, nativeAssetDecimals)
    : "n/a (streaming asset is not COMP)";

  const finish = formatUnixTs(streamEnd);

  // Remaining USD = effective total − already claimed
  const remainingUsdRaw = maxBigInt(effectiveTotalNative - nativeAssetSuppliedAmount, 0n);

  // Simulate claim after SIMULATION_TIME_ADVANCE seconds on a Hardhat fork
  console.log(`  [v2/${target.vendor}] simulating claim after ${SIMULATION_TIME_ADVANCE}s …`);
  const remainingAfterSim = await simulateClaimAfterDelay(target, v2Abi, rpcUrl, hre, overrides.blockTag);

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
    usdValueCannotBeClaimedStreaming: formatTokenAmount(
      unclaimableStreamingNative,
      nativeAssetDecimals
    ),
    streamFinishTs: finish.ts,
    streamFinishUtc: finish.utc,
    budgetForDays: decimalFromRatio(budgetSeconds, 86_400n, 4),
    daysDeficit: decimalFromRatio(daysDeficitSeconds, 86_400n, 4),
    requiredTopUp: formatTokenAmount(requiredTopUp, nativeAssetDecimals),
    totalBudget: formatTokenAmount(totalBudgetRaw, nativeAssetDecimals),
    avgClaimCompPrice: avgPrice,
    compPriceNative,
    remainingStreamTimeSec: remainingSeconds.toString(),
    remainingStreamTimeAfterSimSec: (streamEnd > nowTs + BigInt(SIMULATION_TIME_ADVANCE)
      ? streamEnd - nowTs - BigInt(SIMULATION_TIME_ADVANCE)
      : 0n
    ).toString(),
    remainingUsd: formatTokenAmount(remainingUsdRaw, nativeAssetDecimals),
    remainingUsdAfterClaim567k: formatTokenAmount(remainingAfterSim, nativeAssetDecimals),
  };
}

export async function runReport(
  hre: HardhatRuntimeEnvironment,
  blockNumber?: number,
): Promise<void> {
  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, ".env");
  const fileEnv = parseEnvFile(envPath);
  const rpcMainnet = getEnvVar("RPC_MAINNET", fileEnv);

  const provider = new ethers.JsonRpcProvider(rpcMainnet);
  const compToken = new ethers.Contract(COMP_TOKEN_ADDRESS, ERC20_ABI, provider);

  if (blockNumber !== undefined && (isNaN(blockNumber) || blockNumber <= 0)) {
    throw new Error(`Invalid block value: "${blockNumber}". Must be a positive integer.`);
  }

  const overrides: ViewOverrides = blockNumber !== undefined ? { blockTag: blockNumber } : {};

  let nowTs: bigint;
  if (blockNumber !== undefined) {
    const block = await provider.getBlock(blockNumber);
    if (!block) {
      throw new Error(`Block ${blockNumber} not found`);
    }
    nowTs = BigInt(block.timestamp);
    console.log(`Running report at block ${blockNumber} (${new Date(block.timestamp * 1000).toISOString()})`);
  } else {
    nowTs = BigInt(Math.floor(Date.now() / 1000));
    console.log("Running report at latest block");
  }

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
        ? await buildV1Row(provider, compToken, target, v1Abi, nowTs, rpcMainnet, hre, overrides)
        : await buildV2Row(provider, compToken, target, v2Abi, nowTs, rpcMainnet, hre, overrides);
    rows.push(row);
  }

  const output = toCsv(rows);
  const suffix = blockNumber !== undefined ? `-block-${blockNumber}` : "";
  const outputPath = path.join(projectRoot, `streamer-deficit-report${suffix}.csv`);
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Created report: ${outputPath}`);
}
