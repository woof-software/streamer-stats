# Code Conventions & Style Guide

> **Comprehensive code style guide for Woof Software DeFi backend projects**
>
> These conventions ensure consistency across all projects and improve AI agent code generation quality.
>
> Last Updated: 2026-01-31

---

## Table of Contents

1. [File & Directory Naming](#file--directory-naming)
2. [TypeScript Conventions](#typescript-conventions)
3. [NestJS Patterns](#nestjs-patterns)
4. [DeFi-Specific Conventions](#defi-specific-conventions)
5. [Import Organization](#import-organization)
6. [Code Formatting](#code-formatting)
7. [Naming Conventions](#naming-conventions)
8. [Error Handling](#error-handling)
9. [Logging](#logging)
10. [Comments & Documentation](#comments--documentation)
11. [Git Conventions](#git-conventions)
12. [Database Conventions](#database-conventions)
13. [API Conventions](#api-conventions)
14. [Testing Conventions](#testing-conventions)

---

## File & Directory Naming

### Directory Names

**Always use kebab-case for directories:**

```
✅ CORRECT:
modules/position-tracker/
modules/swap-aggregator/
shared/blockchain-utils/

❌ WRONG:
modules/positionTracker/
modules/SwapAggregator/
shared/blockchainUtils/
```

### File Names

**Pattern: `[feature].[type].ts`**

| Type             | Pattern                          | Example                                |
| ---------------- | -------------------------------- | -------------------------------------- |
| Controller       | `[feature].controller.ts`        | `position.controller.ts`               |
| Service          | `[feature].service.ts`           | `position.service.ts`                  |
| Repository       | `[feature].repository.ts`        | `position.repository.ts`               |
| Module           | `[feature].module.ts`            | `position.module.ts`                   |
| Entity           | `[feature].entity.ts`            | `position.entity.ts`                   |
| DTO              | `[action]-[feature].dto.ts`      | `create-position.dto.ts`               |
| Request DTO      | `[action]-[feature].request.ts`  | `get-position.request.ts`              |
| Response DTO     | `[feature]-response.dto.ts`      | `position-response.dto.ts`             |
| Value Object     | `[name].vo.ts`                   | `health-factor.vo.ts`                  |
| Type             | `[name].type.ts`                 | `address.type.ts`                      |
| Interface        | `[name].interface.ts`            | `protocol-adapter.interface.ts`        |
| Enum             | `[name].enum.ts`                 | `chain.enum.ts`                        |
| Constant         | `[name].constant.ts`             | `chains.constant.ts`                   |
| Util             | `[name].util.ts`                 | `format-address.util.ts`               |
| Guard            | `[name].guard.ts`                | `auth.guard.ts`                        |
| Interceptor      | `[name].interceptor.ts`          | `logging.interceptor.ts`               |
| Decorator        | `[name].decorator.ts`            | `current-user.decorator.ts`            |
| Pipe             | `[name].pipe.ts`                 | `validation.pipe.ts`                   |
| Filter           | `[name].filter.ts`               | `http-exception.filter.ts`             |
| Middleware       | `[name].middleware.ts`           | `logger.middleware.ts`                 |
| Adapter          | `[protocol].adapter.ts`          | `compound.adapter.ts`                  |
| Use Case         | `[action]-[feature].use-case.ts` | `get-position.use-case.ts`             |
| Test             | `[filename].spec.ts`             | `position.service.spec.ts`             |
| E2E Test         | `[feature].e2e-spec.ts`          | `position.e2e-spec.ts`                 |
| Integration Test | `[name].integration.spec.ts`     | `compound-adapter.integration.spec.ts` |
| Config           | `[name].config.ts`               | `database.config.ts`                   |
| Mock             | `[name].mock.ts`                 | `position.mock.ts`                     |

**Index Files:**

```typescript
// ✅ Use index.ts for barrel exports
// modules/positions/domain/entities/index.ts
export { Position } from "./position.entity";
export { PositionHistory } from "./position-history.entity";

// ✅ Use index.ts for clean imports
import { Position, PositionHistory } from "../domain/entities";
```

---

## TypeScript Conventions

### Strict Mode (Always Enabled)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Annotations

```typescript
// ✅ ALWAYS provide explicit return types for functions
function calculateHealthFactor(collateral: bigint, debt: bigint): number {
  return Number(collateral) / Number(debt);
}

// ❌ NEVER omit return types
function calculateHealthFactor(collateral: bigint, debt: bigint) {
  return Number(collateral) / Number(debt);
}

// ✅ Provide types for function parameters
async function getPosition(address: string, chain: Chain): Promise<Position> {
  // ...
}

// ✅ Use readonly for immutable properties
class Position {
  constructor(
    public readonly address: string,
    public readonly supplied: bigint,
    public readonly borrowed: bigint
  ) {}
}

// ✅ Use const assertions for literal objects
const CHAINS = {
  ETHEREUM: 1,
  BASE: 8453,
  ARBITRUM: 42161,
} as const;

type ChainId = (typeof CHAINS)[keyof typeof CHAINS];
```

### Type vs Interface

```typescript
// ✅ Use TYPE for:
// - Union types
type Status = "pending" | "active" | "completed";

// - Intersection types
type User = BaseUser & { roles: string[] };

// - Mapped types
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// - Tuple types
type Point = [number, number];

// ✅ Use INTERFACE for:
// - Object shapes
interface Position {
  address: string;
  supplied: bigint;
  borrowed: bigint;
}

// - When you need declaration merging
interface Window {
  customProperty: string;
}

// - Class contracts
interface ProtocolAdapter {
  getPosition(address: string): Promise<Position>;
}
```

### Avoid 'any'

```typescript
// ❌ NEVER use 'any'
function process(data: any) {
  return data.value;
}

// ✅ Use 'unknown' instead
function process(data: unknown) {
  if (typeof data === "object" && data !== null && "value" in data) {
    return (data as { value: string }).value;
  }
  throw new Error("Invalid data");
}

// ✅ Or use proper types
interface ProcessData {
  value: string;
}

function process(data: ProcessData) {
  return data.value;
}

// ✅ Use generic types when needed
function identity<T>(value: T): T {
  return value;
}
```

### Nullability

```typescript
// ✅ Be explicit about null/undefined
function findPosition(id: string): Position | null {
  // ...
}

// ✅ Use optional chaining
const healthFactor = position?.healthFactor?.getValue();

// ✅ Use nullish coalescing
const amount = position?.supplied ?? 0n;

// ✅ Provide default values
function getMultiplier(value?: number): number {
  return value ?? 1.0;
}

// ❌ Don't use non-null assertions unless absolutely necessary
const position = findPosition(id)!; // BAD - can throw at runtime

// ✅ Handle null explicitly
const position = findPosition(id);
if (!position) {
  throw new NotFoundException(`Position ${id} not found`);
}
```

### Enums

```typescript
// ✅ Use string enums for better debugging
export enum Chain {
  ETHEREUM = "ethereum",
  BASE = "base",
  ARBITRUM = "arbitrum",
  OPTIMISM = "optimism",
}

// ✅ Use const enums for performance (when values won't change)
export const enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
}

// ❌ Avoid numeric enums (hard to debug)
enum Chain {
  ETHEREUM, // 0
  BASE, // 1
  ARBITRUM, // 2
}
```

---

## NestJS Patterns

### Dependency Injection

```typescript
// ✅ ALWAYS use constructor injection
@Injectable()
export class PositionService {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly compoundAdapter: CompoundAdapter,
    private readonly logger: Logger
  ) {}
}

// ❌ NEVER use property injection
@Injectable()
export class PositionService {
  @Inject(PositionRepository)
  private positionRepository: PositionRepository; // BAD
}

// ✅ Use @Optional() for optional dependencies
@Injectable()
export class PositionService {
  constructor(
    private readonly positionRepository: PositionRepository,
    @Optional() private readonly cacheService?: CacheService
  ) {}
}

// ✅ Use @Inject() for custom providers
@Injectable()
export class PositionService {
  constructor(
    @Inject("CONFIG_OPTIONS")
    private readonly config: ConfigOptions
  ) {}
}
```

### Module Organization

```typescript
// ✅ Clear module structure
@Module({
  imports: [
    // External modules
    TypeOrmModule.forFeature([Position, PositionHistory]),
    CacheModule,

    // Other feature modules
    NotificationModule,
  ],
  providers: [
    // Services (application layer)
    PositionService,

    // Domain services
    PositionCalculatorService,
    RiskAnalyzerService,

    // Repositories
    PositionRepository,
    PositionHistoryRepository,

    // Adapters
    CompoundAdapter,
    MorphoAdapter,

    // Use cases
    GetPositionUseCase,
    TrackPositionUseCase,
  ],
  controllers: [PositionController],
  exports: [
    // Only export what other modules need
    PositionService,
    GetPositionUseCase,
  ],
})
export class PositionModule {}
```

### Controllers

```typescript
// ✅ Proper controller structure
@ApiTags("Positions")
@Controller("positions")
export class PositionController {
  constructor(
    private readonly positionService: PositionService,
    private readonly logger: Logger
  ) {}

  @Get(":address")
  @ApiOperation({ summary: "Get user position by address" })
  @ApiParam({ name: "address", description: "User wallet address" })
  @ApiResponse({
    status: 200,
    description: "Position found",
    type: PositionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Position not found" })
  async getPosition(
    @Param("address") address: string,
    @Query() query: GetPositionQueryDto
  ): Promise<PositionResponseDto> {
    this.logger.log(`Getting position for ${address}`);
    const position = await this.positionService.getPosition(
      address,
      query.chain
    );
    return new PositionResponseDto(position);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Track new position" })
  @ApiResponse({ status: 201, description: "Position created" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async trackPosition(
    @Body() dto: TrackPositionDto
  ): Promise<PositionResponseDto> {
    const position = await this.positionService.trackPosition(dto);
    return new PositionResponseDto(position);
  }
}
```

### DTOs

```typescript
// ✅ Proper DTO with validation
import {
  IsEthereumAddress,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { Chain } from "@/shared/domain/value-objects/chain.vo";

export class GetPositionQueryDto {
  @IsEnum(Chain)
  @ApiProperty({
    enum: Chain,
    description: "Blockchain network",
    example: Chain.ETHEREUM,
  })
  chain: Chain;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: "Protocol name",
    example: "compound-v3",
  })
  protocol?: string;
}

export class TrackPositionDto {
  @IsEthereumAddress()
  @Transform(({ value }) => value.toLowerCase())
  @ApiProperty({
    description: "User wallet address",
    example: "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  })
  address: string;

  @IsEnum(Chain)
  @ApiProperty({ enum: Chain })
  chain: Chain;
}

// ✅ Response DTO with transformation
export class PositionResponseDto {
  @ApiProperty({ example: "0x742d35cc6634c0532925a3b844bc9e7595f0beb" })
  address: string;

  @ApiProperty({ example: "1000000000000000000" })
  supplied: string; // BigInt as string

  @ApiProperty({ example: "500000000000000000" })
  borrowed: string;

  @ApiProperty({ example: 2.5 })
  healthFactor: number;

  constructor(position: Position) {
    this.address = position.address;
    this.supplied = position.supplied.toString();
    this.borrowed = position.borrowed.toString();
    this.healthFactor = position.calculateHealthFactor();
  }
}
```

### Services

```typescript
// ✅ Service with single responsibility
@Injectable()
export class PositionService {
  private readonly logger = new Logger(PositionService.name);

  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly compoundAdapter: CompoundAdapter,
    private readonly cacheService: CacheService
  ) {}

  async getPosition(address: string, chain: Chain): Promise<Position> {
    this.logger.log(`Fetching position for ${address} on ${chain}`);

    // Check cache first
    const cacheKey = `position:${chain}:${address}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${address}`);
      return cached;
    }

    // Fetch from blockchain
    const blockchainData = await this.compoundAdapter.getPosition(address);

    // Transform to domain entity
    const position = new Position({
      address,
      chain,
      ...blockchainData,
    });

    // Cache result
    await this.cacheService.set(cacheKey, position, 300);

    return position;
  }

  async trackPosition(dto: TrackPositionDto): Promise<Position> {
    const position = await this.getPosition(dto.address, dto.chain);
    await this.positionRepository.save(position);
    return position;
  }
}
```

---

## DeFi-Specific Conventions

### BigInt for Token Amounts

```typescript
// ✅ ALWAYS use BigInt for token amounts
const amount: bigint = 1000000000000000000n; // 1 token with 18 decimals

// ✅ Use shared MathLib for format/parse (no ethers dependency for backend math)
import { formatUnits, parseUnits, WAD } from "@/shared/utils/math";
const amount = parseUnits("1.5", 18); // 1.5 tokens
const formatted = formatUnits(amount, 18); // "1.5"

// ✅ Use ethers.js when interacting with contracts
import { ethers } from "ethers";
const amount = ethers.parseUnits("1.5", 18);

// ❌ NEVER use Number for token amounts (precision loss)
const amount = 1.5 * 1e18; // BAD - loses precision for large numbers

// ❌ NEVER use parseFloat/parseInt for token amounts
const amount = parseFloat("1500000000000000000"); // BAD - precision loss
```

### Fixed-Point Arithmetic (MathLib)

```typescript
// ✅ Use shared MathLib for BigInt calculations (WAD/RAY, mul/div, interest)
import {
  wMulDown,
  wDivDown,
  mulDivDown,
  formatUnits,
  parseUnits,
  convertDecimals,
  percentageOf,
  wTaylorCompounded,
  WAD,
} from "@/shared/utils/math";

// Fixed-point multiply/divide (rounding matters for DeFi)
const product = wMulDown(amountWad, rateWad); // (x * y) / WAD, round down
const quotient = wDivDown(numeratorWad, denominatorWad);

// Generic mul/div with denominator
const result = mulDivDown(x, y, denominator);

// Convert between decimals (e.g. USDC 6 → WAD 18)
const wadAmount = convertDecimals(usdcAmount, 6, 18);

// Percentage and interest (BigInt-safe)
const fee = percentageOf(amount, 30); // 30%
const multiplier = wTaylorCompounded(rateWad, timeWad);

// ❌ Don't use Number() or float math for token/rate calculations
const bad = Number(collateralWad) / Number(debtWad); // BAD - precision loss
```

### Address Handling

```typescript
// ✅ Store addresses in lowercase (checksummed in responses only)
import { isAddress, getAddress } from "ethers";

// Validation
if (!isAddress(address)) {
  throw new BadRequestException("Invalid Ethereum address");
}

// Storage (lowercase)
const normalizedAddress = address.toLowerCase();

// Response (checksummed)
const checksummedAddress = getAddress(address);

// ✅ Use Address value object
import { Address } from "@/shared/domain/value-objects/address.vo";

class Position {
  constructor(
    public readonly address: Address // Validates on construction
  ) {}
}
```

### Chain Handling

```typescript
// ✅ Use Chain enum
export enum Chain {
  ETHEREUM = "ethereum",
  BASE = "base",
  ARBITRUM = "arbitrum",
  OPTIMISM = "optimism",
  POLYGON = "polygon",
}

// ✅ Map to chain IDs
export const CHAIN_IDS: Record<Chain, number> = {
  [Chain.ETHEREUM]: 1,
  [Chain.BASE]: 8453,
  [Chain.ARBITRUM]: 42161,
  [Chain.OPTIMISM]: 10,
  [Chain.POLYGON]: 137,
};

// ✅ Get chain from ID
export function getChainById(chainId: number): Chain {
  const entry = Object.entries(CHAIN_IDS).find(([_, id]) => id === chainId);
  if (!entry) {
    throw new Error(`Unknown chain ID: ${chainId}`);
  }
  return entry[0] as Chain;
}
```

### Contract Interactions

```typescript
// ✅ Use ethers.js v6
import { ethers } from "ethers";

// ✅ Proper contract setup
const provider = new ethers.JsonRpcProvider(rpcUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);

// ✅ Handle BigInt in contract calls
const amount = ethers.parseUnits("1.5", 18);
const tx = await contract.supply(asset, amount);

// ✅ Wait for confirmations
await tx.wait(2); // Wait for 2 confirmations

// ✅ Handle reverts gracefully
try {
  const tx = await contract.supply(asset, amount);
  await tx.wait();
} catch (error) {
  if (error.code === "CALL_EXCEPTION") {
    throw new BadRequestException("Contract call reverted");
  }
  throw error;
}

// ✅ Use multicall for batch reads
import { Contract } from "ethers";

const calls = addresses.map((address) => ({
  target: contractAddress,
  callData: contract.interface.encodeFunctionData("balanceOf", [address]),
}));

const results = await multicall.aggregate(calls);
```

### Decimal Precision

```typescript
// ✅ Document decimals clearly
interface Token {
  address: string;
  symbol: string;
  decimals: number; // Always include decimals
}

// ✅ Use shared MathLib for format/parse (consistent, no ethers needed for backend)
import { formatUnits, parseUnits, convertDecimals } from "@/shared/utils/math";

function formatAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

function parseAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

// ✅ Handle different decimal places with convertDecimals
const USDC_DECIMALS = 6;
const WETH_DECIMALS = 18;

const usdcAmount = parseUnits("1000", USDC_DECIMALS); // 1000 USDC
const wethAmount = parseUnits("1.5", WETH_DECIMALS); // 1.5 WETH
const usdcInWad = convertDecimals(usdcAmount, USDC_DECIMALS, 18);
```

---

## Import Organization

### Order of Imports

```typescript
// 1. Node.js built-in modules
import { createHash } from "crypto";
import { readFile } from "fs/promises";

// 2. External dependencies (alphabetically)
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ethers } from "ethers";
import { Repository } from "typeorm";

// 3. Shared modules (using @/ alias, alphabetically)
import { Address } from "@/shared/domain/value-objects/address.vo";
import { Chain } from "@/shared/domain/value-objects/chain.vo";
import { RPCClient } from "@/shared/infrastructure/blockchain/rpc-client.service";
import { CacheService } from "@/shared/infrastructure/cache/cache.service";

// 4. Module-relative imports (by proximity)
import { Position } from "../domain/entities/position.entity";
import { HealthFactor } from "../domain/value-objects/health-factor.vo";
import { PositionRepository } from "../infrastructure/persistence/position.repository";
import { CompoundAdapter } from "../infrastructure/blockchain/compound.adapter";
```

### Path Aliases

```typescript
// ✅ Use @/ for absolute imports from src/
import { Address } from "@/shared/domain/value-objects/address.vo";
import { Chain } from "@/shared/domain/value-objects/chain.vo";

// ✅ Use relative imports within same module
import { Position } from "../domain/entities/position.entity";
import { HealthFactor } from "../domain/value-objects/health-factor.vo";

// ❌ Don't mix styles
import { Address } from "@/shared/domain/value-objects/address.vo";
import { Position } from "@/modules/positions/domain/entities/position.entity"; // BAD
```

---

## Code Formatting

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Line Length

```typescript
// ✅ Max 100 characters per line
function calculateHealthFactor(
  collateralUSD: bigint,
  borrowedUSD: bigint,
  liquidationFactor: number
): number {
  // Implementation
}

// ✅ Break long function calls
const position = await this.positionService.trackPosition(
  address,
  chain,
  protocol,
  options
);

// ✅ Break long conditionals
if (
  position.healthFactor < LIQUIDATION_THRESHOLD &&
  position.borrowed > MIN_BORROW_AMOUNT &&
  !position.isWhitelisted
) {
  // Liquidation logic
}
```

### Spacing

```typescript
// ✅ Space after keywords
if (condition) {
  // code
}

for (const item of items) {
  // code
}

// ✅ Space around operators
const sum = a + b;
const isValid = value > 0 && value < 100;

// ✅ No space before function parentheses
function myFunction() {}
async function asyncFunction() {}

// ✅ Space after commas
const array = [1, 2, 3, 4];
myFunction(arg1, arg2, arg3);

// ✅ Blank lines for readability
function processData() {
  // Fetch data
  const data = fetchData();

  // Validate
  if (!isValid(data)) {
    throw new Error("Invalid data");
  }

  // Process
  return transform(data);
}
```

---

## Naming Conventions

### Variables

```typescript
// ✅ camelCase for variables and function names
const userAddress = "0x742d35cc6634c0532925a3b844bc9e7595f0beb";
let totalSupplied = 0n;

function calculateHealthFactor() {}
async function fetchPosition() {}

// ✅ Descriptive names
const liquidationThreshold = 0.75;
const minimumHealthFactor = 1.0;

// ❌ Single letter variables (except in loops/math)
const t = 1000; // BAD
const timeout = 1000; // GOOD

// ✅ Single letters OK in short loops
for (let i = 0; i < items.length; i++) {}
items.map((item, i) => ({ ...item, index: i }));

// ✅ Meaningful loop variables for clarity
for (const position of positions) {
}
```

### Constants

```typescript
// ✅ SCREAMING_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_CACHE_TTL = 300;
const LIQUIDATION_THRESHOLD = 0.75;

// ✅ Group related constants
const CHAIN_IDS = {
  ETHEREUM: 1,
  BASE: 8453,
  ARBITRUM: 42161,
} as const;

const GAS_LIMITS = {
  SWAP: 500000,
  SUPPLY: 200000,
  BORROW: 250000,
} as const;
```

### Classes

```typescript
// ✅ PascalCase for classes
class Position {}
class HealthFactor {}
class PositionService {}
class CompoundAdapter {}

// ✅ Descriptive class names
class UserPositionCalculator {}
class CompoundV3Adapter {}
class PositionCacheService {}

// ✅ Use suffixes for class types
class PositionService {} // Business logic
class PositionRepository {} // Data access
class PositionController {} // HTTP endpoint
class PositionEntity {} // Database entity
class PositionDto {} // Data transfer
class PositionGuard {} // Auth/validation
class PositionInterceptor {} // Request/response modification
```

### Functions

```typescript
// ✅ Verb-based names for functions
function getPosition() {}
function calculateHealthFactor() {}
function validateAddress() {}
function fetchFromBlockchain() {}

// ✅ Boolean functions start with is/has/can/should
function isHealthy() {}
function hasCollateral() {}
function canLiquidate() {}
function shouldAlert() {}

// ✅ Async functions are clear about it
async function fetchPosition() {}
async function saveToDatabase() {}

// ❌ Don't use 'get' for async operations
async function getPosition() {} // Misleading - sounds synchronous
async function fetchPosition() {} // Better - clearly async
```

### Booleans

```typescript
// ✅ Boolean variables start with is/has/can/should
const isActive = true;
const hasCollateral = position.collateral > 0n;
const canLiquidate = healthFactor < 1.0;
const shouldNotify = isAtRisk && !hasBeenNotified;

// ❌ Don't use negative names
const isNotActive = false; // BAD
const isActive = true; // GOOD
```

---

## Error Handling

### Exception Types

```typescript
// ✅ Use NestJS built-in exceptions
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";

// ✅ Provide clear error messages
throw new NotFoundException(`Position not found for address ${address}`);
throw new BadRequestException("Invalid Ethereum address");

// ✅ Create custom exceptions when needed
export class InsufficientCollateralException extends BadRequestException {
  constructor(required: bigint, available: bigint) {
    super(
      `Insufficient collateral. Required: ${required}, Available: ${available}`
    );
  }
}

export class PositionLiquidatedException extends ConflictException {
  constructor(address: string) {
    super(`Position ${address} has been liquidated`);
  }
}
```

### Try-Catch Blocks

```typescript
// ✅ Catch specific errors
try {
  const position = await this.compoundAdapter.getPosition(address);
} catch (error) {
  if (error.code === 'CALL_EXCEPTION') {
    throw new BadRequestException('Failed to fetch position from blockchain');
  }
  if (error.code === 'NETWORK_ERROR') {
    throw new InternalServerErrorException('RPC network error');
  }
  throw error; // Re-throw unknown errors
}

// ✅ Use finally for cleanup
let connection: Connection | null = null;
try {
  connection = await this.getConnection();
  await connection.query(sql);
} catch (error) {
  this.logger.error('Query failed', error);
  throw error;
} finally {
  if (connection) {
    await connection.close();
  }
}

// ✅ Log errors before throwing
catch (error) {
  this.logger.error(`Failed to process position for ${address}`, error.stack);
  throw new InternalServerErrorException('Failed to process position');
}
```

### Error Responses

```typescript
// ✅ Consistent error response format
{
  "statusCode": 404,
  "message": "Position not found for address 0x742d35...",
  "error": "Not Found",
  "timestamp": "2026-01-31T12:00:00.000Z",
  "path": "/positions/0x742d35..."
}

// ✅ Use exception filters for custom formatting
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      message: exception instanceof HttpException
        ? exception.message
        : 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

## Logging

### Log Levels

```typescript
// ✅ Use appropriate log levels
this.logger.error("Critical error occurred", error.stack); // Errors
this.logger.warn("Position health factor below 1.5"); // Warnings
this.logger.log("Fetching position for address"); // Info
this.logger.debug("Cache hit for position"); // Debug
this.logger.verbose("Detailed operation info"); // Verbose

// ✅ Include context in logs
this.logger.log(`Fetching position for ${address} on ${chain}`);
this.logger.error(`Failed to fetch position for ${address}`, error.stack);

// ✅ Use structured logging
this.logger.log({
  message: "Position fetched",
  address,
  chain,
  protocol,
  healthFactor: position.healthFactor,
});
```

### Logger Setup

```typescript
// ✅ Create logger per class
@Injectable()
export class PositionService {
  private readonly logger = new Logger(PositionService.name);

  async getPosition(address: string): Promise<Position> {
    this.logger.log(`Getting position for ${address}`);
    // ...
  }
}

// ✅ Don't use console.log/console.error
console.log("Position fetched"); // ❌ BAD
this.logger.log("Position fetched"); // ✅ GOOD
```

---

## Comments & Documentation

### JSDoc Comments

````typescript
/**
 * Calculates the health factor for a lending position.
 *
 * The health factor indicates how safe a position is from liquidation.
 * A health factor below 1.0 means the position can be liquidated.
 *
 * @param collateralUSD - Total collateral value in USD (with 18 decimals)
 * @param borrowedUSD - Total borrowed value in USD (with 18 decimals)
 * @param liquidationFactor - Liquidation threshold (e.g., 0.75 for 75%)
 * @returns The health factor as a decimal number
 *
 * @example
 * ```typescript
 * const hf = calculateHealthFactor(
 *   10000n * 10n ** 18n, // $10,000 collateral
 *   5000n * 10n ** 18n,  // $5,000 borrowed
 *   0.75                 // 75% liquidation threshold
 * );
 * console.log(hf); // 1.5
 * ```
 */
export function calculateHealthFactor(
  collateralUSD: bigint,
  borrowedUSD: bigint,
  liquidationFactor: number
): number {
  if (borrowedUSD === 0n) return Infinity;
  const collateral = Number(collateralUSD) / 1e18;
  const borrowed = Number(borrowedUSD) / 1e18;
  return (collateral * liquidationFactor) / borrowed;
}
````

### Inline Comments

```typescript
// ✅ Explain WHY, not WHAT
// Compound V3 returns negative principal for borrows
const borrowed = principal < 0 ? BigInt(-principal) : 0n;

// ✅ Document complex logic; use MathLib for BigInt-safe interest/APY
import { aprToApy, wTaylorCompounded } from "@/shared/utils/math";
// APY from APR (BigInt WAD): aprToApy(aprWad, compoundingPeriodsPerYear)
const apyWad = aprToApy(rateWad, 365n);

// ❌ Don't use Math.pow with token/rate numbers (precision loss)
// const apy = Math.pow(1 + rate / periods, periods) - 1; // BAD for bigint

// ✅ Mark TODOs clearly
// TODO(dmitriy): Add support for Morpho Blue markets
// TODO: Implement position history tracking

// ❌ Don't comment obvious code
// Increment counter
counter++; // BAD

// Get position
const position = await this.getPosition(address); // BAD
```

### File Headers

```typescript
/**
 * Position Service
 *
 * Manages DeFi lending positions across multiple protocols.
 * Handles fetching, tracking, and calculating position metrics.
 *
 * @module modules/positions/application
 */

import { Injectable } from "@nestjs/common";
// ...
```

---

## Git Conventions

### Commit Messages

**Format:**

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no functional change)
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `docs`: Documentation only
- `chore`: Maintenance tasks (deps, config, etc.)
- `style`: Code style/formatting (no logic change)
- `ci`: CI/CD changes

**Examples:**

```bash
feat(positions): add Morpho Blue position tracking

Add support for tracking positions in Morpho Blue markets.
Includes adapter, repository, and API endpoints.

Closes #123

---

fix(compound): correct health factor calculation for WETH

The health factor was calculated incorrectly for WETH markets
due to wrong decimal handling.

---

refactor(shared): extract address validation to value object

Move address validation logic from multiple services into
a reusable Address value object.

---

perf(cache): implement Redis pipelining for batch operations

Reduces cache operations from O(n) to O(1) for batch reads.
Improves performance by ~60% for position tracking.

---

test(positions): add integration tests for Compound adapter

---

docs(morpho): add protocol integration guide

---

chore(deps): update ethers.js to v6.10.0
```

### Branch Naming

```bash
# ✅ Feature branches
feat/morpho-integration
feat/position-history-tracking
feat/health-alerts

# ✅ Fix branches
fix/health-factor-calculation
fix/address-validation

# ✅ Refactor branches
refactor/extract-value-objects
refactor/consolidate-adapters

# ✅ Release branches
release/v1.2.0

# ✅ Hotfix branches
hotfix/critical-rpc-error

# ❌ Don't use generic names
feature-123
fix-bug
update-code
```

---

## Database Conventions

### Table Names

```typescript
// ✅ Plural, lowercase, snake_case
@Entity("positions")
export class Position {}

@Entity("position_histories")
export class PositionHistory {}

@Entity("user_wallets")
export class UserWallet {}
```

### Column Names

```typescript
// ✅ snake_case for column names
@Entity("positions")
export class Position {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_address" })
  userAddress: string;

  @Column({ name: "supplied_amount" })
  suppliedAmount: string; // BigInt as string

  @Column({ name: "created_at" })
  @CreateDateColumn()
  createdAt: Date;

  @Column({ name: "updated_at" })
  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Indexes

```typescript
// ✅ Add indexes for frequently queried columns
@Entity("positions")
@Index(["userAddress", "chain", "protocol"])
export class Position {
  @Column({ name: "user_address" })
  @Index()
  userAddress: string;

  @Column()
  @Index()
  chain: string;

  @Column()
  protocol: string;
}
```

### Migrations

```typescript
// ✅ Descriptive migration names
// migrations/1234567890123-create-positions-table.ts
// migrations/1234567890124-add-health-factor-to-positions.ts
// migrations/1234567890125-create-index-on-user-address.ts

// ✅ Reversible migrations
export class CreatePositionsTable1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "positions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          // ...
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("positions");
  }
}
```

---

## API Conventions

### Endpoint Naming

```typescript
// ✅ RESTful naming
GET    /positions              // List all
GET    /positions/:address     // Get one
POST   /positions              // Create
PUT    /positions/:address     // Update (full)
PATCH  /positions/:address     // Update (partial)
DELETE /positions/:address     // Delete

// ✅ Use nested resources for relationships
GET    /positions/:address/history
GET    /vendors/:id/products

// ✅ Use query params for filtering
GET    /positions?chain=ethereum&protocol=compound-v3

// ✅ Use kebab-case for multi-word endpoints
GET    /health-factor
GET    /swap-quotes
```

### Response Format

```typescript
// ✅ Consistent response structure
{
  "data": {
    "address": "0x742d35...",
    "supplied": "1000000000000000000",
    "borrowed": "500000000000000000",
    "healthFactor": 2.5
  }
}

// ✅ Paginated responses
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// ✅ Error responses
{
  "statusCode": 404,
  "message": "Position not found",
  "error": "Not Found",
  "timestamp": "2026-01-31T12:00:00.000Z",
  "path": "/positions/0x742d35..."
}
```

### HTTP Status Codes

```typescript
// ✅ Use correct status codes
200; // OK - Successful GET
201; // Created - Successful POST
204; // No Content - Successful DELETE
400; // Bad Request - Invalid input
401; // Unauthorized - Missing/invalid auth
403; // Forbidden - Valid auth, insufficient permissions
404; // Not Found - Resource doesn't exist
409; // Conflict - Resource conflict (duplicate)
500; // Internal Server Error - Server error
503; // Service Unavailable - Temporary outage
```

---

## Testing Conventions

### Test File Structure

```typescript
// ✅ Clear test structure
describe("PositionService", () => {
  let service: PositionService;
  let repository: MockType<PositionRepository>;
  let adapter: MockType<CompoundAdapter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionService,
        {
          provide: PositionRepository,
          useFactory: mockRepository,
        },
        {
          provide: CompoundAdapter,
          useFactory: mockAdapter,
        },
      ],
    }).compile();

    service = module.get<PositionService>(PositionService);
    repository = module.get(PositionRepository);
    adapter = module.get(CompoundAdapter);
  });

  describe("getPosition", () => {
    it("should return position from cache if available", async () => {
      // Arrange
      const address = "0x742d35cc6634c0532925a3b844bc9e7595f0beb";
      const cachedPosition = new Position({
        address,
        supplied: 1000n,
        borrowed: 500n,
      });
      jest.spyOn(cacheService, "get").mockResolvedValue(cachedPosition);

      // Act
      const result = await service.getPosition(address, Chain.ETHEREUM);

      // Assert
      expect(result).toEqual(cachedPosition);
      expect(adapter.getPosition).not.toHaveBeenCalled();
    });

    it("should fetch from blockchain if not cached", async () => {
      // Arrange
      const address = "0x742d35cc6634c0532925a3b844bc9e7595f0beb";
      jest.spyOn(cacheService, "get").mockResolvedValue(null);
      adapter.getPosition.mockResolvedValue({
        supplied: 1000n,
        borrowed: 500n,
      });

      // Act
      const result = await service.getPosition(address, Chain.ETHEREUM);

      // Assert
      expect(adapter.getPosition).toHaveBeenCalledWith(address);
      expect(result.supplied).toBe(1000n);
    });

    it("should throw NotFoundException if position not found", async () => {
      // Arrange
      const address = "0x742d35cc6634c0532925a3b844bc9e7595f0beb";
      jest.spyOn(cacheService, "get").mockResolvedValue(null);
      adapter.getPosition.mockRejectedValue(new Error("Position not found"));

      // Act & Assert
      await expect(
        service.getPosition(address, Chain.ETHEREUM)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Test Naming

```typescript
// ✅ Descriptive test names
it("should calculate health factor correctly");
it("should return Infinity when borrowed is zero");
it("should throw BadRequestException for invalid address");

// ❌ Vague test names
it("works");
it("test1");
it("should return value");
```

---

**This conventions guide should be followed for all Woof Software DeFi backend projects.**

**For questions or updates, create an issue or submit a PR.**
