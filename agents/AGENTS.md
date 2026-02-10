# AGENTS.md

> **AI Agent Instructions for Woof Software DeFi Backend Projects**
>
> This file provides instructions for AI coding agents (Cursor, Claude Code, GitHub Copilot, etc.) working on Woof Software DeFi backend projects.
>
> Last Updated: 2026-01-31

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Principles](#architecture-principles)
3. [Project Structure](#project-structure)
4. [Module Development](#module-development)
5. [Code Conventions](#code-conventions)
6. [Testing Strategy](#testing-strategy)
7. [Common Patterns](#common-patterns)
8. [External Integrations](#external-integrations)
9. [Development Workflow](#development-workflow)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

### Tech Stack

- **Runtime:** Node.js 20+ LTS
- **Framework:** NestJS 10+
- **Language:** TypeScript 5+ (strict mode)
- **Database:** PostgreSQL 16+
- **Cache:** Redis 7+
- **Blockchain:** ethers.js v6 (NOT web3.js)
- **Indexer:** Ponder (separate service)
- **API Protocol:** REST (external), gRPC (internal services)
- **Testing:** Jest + Vitest
- **ORM:** TypeORM
- **Validation:** Zod (primary) + class-validator (NestJS DTOs only)
- **Documentation:** Swagger/OpenAPI

### Project Purpose

This is a **foundation template** for building DeFi backend services at Woof Software. It provides:

- ✅ Standard architecture and structure
- ✅ Pre-configured infrastructure (database, cache, RPC)
- ✅ Common DeFi utilities (address validation, BigInt handling, contract interactions)
- ✅ Testing setup and examples
- ✅ Deployment configuration (Docker, GitHub Actions)
- ✅ AI agent-friendly documentation

---

## Architecture Principles

### 1. Vertical Slice Architecture

Each feature is a **self-contained module** with all its concerns in one place.

```
✅ GOOD: Everything for "positions" in one place
modules/positions/
  domain/
  application/
  infrastructure/
  api/

❌ BAD: Split across project
src/
  controllers/position.controller.ts
  services/position.service.ts
  repositories/position.repository.ts
```

### 2. Complexity-Based Layering

**Start simple, add layers only when needed:**

- **Simple modules** (≤3 files): Just controller + service + module
- **Standard modules** (4-10 files): Add domain/, infrastructure/, api/
- **Complex modules** (10+ files): Full DDD layers with value objects, events, use cases

### 3. Dependency Flow

```
API Layer (HTTP/gRPC)
    ↓
Application Layer (Use Cases, Orchestration)
    ↓
Domain Layer (Business Logic, Entities)
    ↓
Infrastructure Layer (External Systems, Database, Blockchain)
```

**Rules:**

- ✅ Domain layer NEVER imports from other layers
- ✅ Application layer can use domain
- ✅ Infrastructure layer can use domain + external libraries
- ✅ API layer can use application + DTOs only
- ❌ No circular dependencies between modules

### 4. Shared vs Module Code

**Use shared/ for:**

- ✅ Primitives (Address, Chain, Money value objects)
- ✅ Infrastructure (RPC client, cache, database config)
- ✅ Pure utilities (validation, formatting, math)

**Keep in modules/ for:**

- ❌ Module-specific logic
- ❌ Domain models
- ❌ Business rules

---

## Project Structure

### Root Structure

```
project-root/
├── src/
│   ├── modules/              # Feature modules (vertical slices)
│   ├── shared/               # Shared infrastructure & utilities
│   ├── config/               # Configuration
│   ├── app.module.ts         # Root module
│   └── main.ts               # Application bootstrap
│
├── docs/                     # Documentation
│   ├── modules/              # Per-module documentation
│   ├── architecture/         # Architecture Decision Records (ADRs)
│   └── protocols/            # External protocol docs (llms.txt files)
│
├── agents/                   # AI agent instructions
│   ├── AGENTS.md             # This file
│   ├── CONVENTIONS.md        # Code style and naming
│   ├── ARCHITECTURE.md       # Architecture details
│   └── modules/              # Module-specific agent instructions
│
├── scripts/                  # Development & deployment scripts
├── test/                     # Global test setup & e2e tests
├── .github/workflows/        # CI/CD pipelines
└── [config files]
```

### Module Structure

```
modules/[feature-name]/
├── domain/                   # Business logic (optional, for complex modules)
│   ├── entities/             # Domain entities
│   ├── value-objects/        # Immutable value objects
│   ├── services/             # Domain services (pure business logic)
│   └── events/               # Domain events (optional)
│
├── application/              # Use cases & orchestration
│   ├── use-cases/            # Specific use cases (complex modules)
│   ├── [feature].service.ts  # Application service (orchestration)
│   └── dtos/                 # Data Transfer Objects
│       ├── requests/
│       └── responses/
│
├── infrastructure/           # External systems (optional)
│   ├── persistence/          # Repositories
│   ├── blockchain/           # Contract adapters
│   ├── cache/                # Caching logic
│   └── events/               # Event publishers
│
├── api/                      # HTTP interface
│   ├── [feature].controller.ts
│   ├── guards/               # Auth & validation guards
│   └── interceptors/         # Request/response interceptors
│
├── __tests__/                # Module tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── [feature].module.ts       # NestJS module definition
└── README.md                 # Module documentation
```

### Shared Structure

```
shared/
├── domain/                   # Shared domain primitives
│   ├── schemas/
│   │   ├── address.schema.ts
│   │   ├── chain.schema.ts
│   │   ├── token-amount.schema.ts
│   │   ├── hex.schema.ts
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── address.vo.ts
│   │   ├── chain.vo.ts
│   │   ├── token-amount.vo.ts
│   │   └── money.vo.ts
│   └── types/
│       ├── hex.type.ts
│       └── bigint-string.type.ts
│
├── infrastructure/           # Shared infrastructure
│   ├── database/
│   │   ├── database.module.ts
│   │   └── base.repository.ts
│   ├── cache/
│   │   ├── cache.module.ts
│   │   └── cache.service.ts
│   ├── blockchain/
│   │   ├── rpc-client.service.ts
│   │   ├── contract-client.base.ts
│   │   └── event-listener.base.ts
│   └── notifications/
│       ├── telegram.service.ts
│       └── slack.service.ts
│
├── utils/                    # Pure utilities
│   ├── validation/
│   ├── formatting/
│   └── math/
│
└── guards/                   # Global guards
    └── auth.guard.ts
```

---

## Module Development

### Module Complexity Decision Tree

```
START
  ↓
Is it just a health check or simple status endpoint?
  → YES: Simple Module (3 files)
  → NO: Continue
  ↓
Does it have business rules or calculations?
  → NO: Standard Module (add application/)
  → YES: Continue
  ↓
Does it integrate with external protocols/systems?
  → YES: Complex Module (add domain/ + infrastructure/)
  → NO: Standard Module
```

### Simple Module Template

**Use for:** Health checks, status endpoints, simple data retrieval

```typescript
// modules/health/health.controller.ts
import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "@/shared/guards/public.decorator";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: "Health check endpoint" })
  getHealth() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
```

```typescript
// modules/health/health.module.ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

**File count:** 2-3 files

---

### Standard Module Template

**Use for:** CRUD operations, data management, moderate business logic

```
modules/vendors/
├── application/
│   ├── vendor.service.ts
│   └── dtos/
│       ├── create-vendor.dto.ts
│       ├── update-vendor.dto.ts
│       └── vendor-response.dto.ts
├── infrastructure/
│   └── vendor.repository.ts
├── api/
│   └── vendor.controller.ts
├── domain/
│   └── vendor.entity.ts
├── vendor.module.ts
└── README.md
```

**Example Entity:**

```typescript
// modules/vendors/domain/vendor.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Address } from "@/shared/domain/value-objects/address.vo";

@Entity("vendors")
export class Vendor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 42, unique: true })
  address: Address;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Example Service:**

```typescript
// modules/vendors/application/vendor.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { VendorRepository } from "../infrastructure/vendor.repository";
import { CreateVendorDto } from "./dtos/create-vendor.dto";
import { Vendor } from "../domain/vendor.entity";

@Injectable()
export class VendorService {
  constructor(private readonly vendorRepository: VendorRepository) {}

  async create(dto: CreateVendorDto): Promise<Vendor> {
    const vendor = this.vendorRepository.create(dto);
    return this.vendorRepository.save(vendor);
  }

  async findAll(): Promise<Vendor[]> {
    return this.vendorRepository.find({ where: { isActive: true } });
  }

  async findById(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return vendor;
  }
}
```

**File count:** 6-10 files

---

### Complex Module Template

**Use for:** DeFi positions, orders, transactions, protocol integrations

```
modules/positions/
├── domain/
│   ├── entities/
│   │   ├── position.entity.ts
│   │   └── position-history.entity.ts
│   ├── value-objects/
│   │   ├── health-factor.vo.ts
│   │   ├── token-amount.vo.ts
│   │   └── liquidation-price.vo.ts
│   ├── services/
│   │   ├── position-calculator.service.ts
│   │   └── risk-analyzer.service.ts
│   └── events/
│       └── position-updated.event.ts
│
├── application/
│   ├── use-cases/
│   │   ├── get-position.use-case.ts
│   │   ├── track-position.use-case.ts
│   │   └── calculate-liquidation.use-case.ts
│   ├── position.service.ts
│   └── dtos/
│       ├── get-position.dto.ts
│       ├── position-response.dto.ts
│       └── position-history-response.dto.ts
│
├── infrastructure/
│   ├── persistence/
│   │   ├── position.repository.ts
│   │   └── position-history.repository.ts
│   ├── blockchain/
│   │   ├── compound.adapter.ts
│   │   ├── morpho.adapter.ts
│   │   └── aave.adapter.ts
│   ├── cache/
│   │   └── position-cache.service.ts
│   └── indexer/
│       └── ponder-client.service.ts
│
├── api/
│   ├── position.controller.ts
│   ├── guards/
│   │   └── position-access.guard.ts
│   └── interceptors/
│       └── position-cache.interceptor.ts
│
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── position.module.ts
└── README.md
```

**Example Value Object:**

```typescript
// modules/positions/domain/value-objects/health-factor.vo.ts
export class HealthFactor {
  private readonly value: number;

  constructor(
    collateralUSD: bigint,
    borrowUSD: bigint,
    liquidationFactor: number
  ) {
    if (borrowUSD === 0n) {
      this.value = Infinity;
    } else {
      const collateralValue = Number(collateralUSD) / 1e18;
      const borrowValue = Number(borrowUSD) / 1e18;
      this.value = (collateralValue * liquidationFactor) / borrowValue;
    }
  }

  getValue(): number {
    return this.value;
  }

  isHealthy(): boolean {
    return this.value >= 1.5;
  }

  isAtRisk(): boolean {
    return this.value >= 1.0 && this.value < 1.5;
  }

  isLiquidatable(): boolean {
    return this.value < 1.0;
  }

  getRiskLevel(): "HEALTHY" | "AT_RISK" | "LIQUIDATABLE" {
    if (this.isLiquidatable()) return "LIQUIDATABLE";
    if (this.isAtRisk()) return "AT_RISK";
    return "HEALTHY";
  }
}
```

**Example Use Case:**

```typescript
// modules/positions/application/use-cases/get-position.use-case.ts
import { Injectable } from "@nestjs/common";
import { Address } from "@/shared/domain/value-objects/address.vo";
import { Chain } from "@/shared/domain/value-objects/chain.vo";
import { Position } from "../../domain/entities/position.entity";
import { PositionRepository } from "../../infrastructure/persistence/position.repository";
import { CompoundAdapter } from "../../infrastructure/blockchain/compound.adapter";
import { PositionCacheService } from "../../infrastructure/cache/position-cache.service";

@Injectable()
export class GetPositionUseCase {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly compoundAdapter: CompoundAdapter,
    private readonly cacheService: PositionCacheService
  ) {}

  async execute(
    address: Address,
    chain: Chain,
    protocol: string
  ): Promise<Position> {
    // 1. Check cache
    const cacheKey = `position:${chain}:${protocol}:${address}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // 2. Fetch from blockchain
    const blockchainData = await this.compoundAdapter.getPosition(address);

    // 3. Transform to domain entity
    const position = new Position({
      address,
      chain,
      protocol,
      supplied: blockchainData.supplied,
      borrowed: blockchainData.borrowed,
      collateral: blockchainData.collateral,
    });

    // 4. Save to database
    await this.positionRepository.save(position);

    // 5. Cache result
    await this.cacheService.set(cacheKey, position, 300); // 5 min TTL

    return position;
  }
}
```

**File count:** 15-25 files

---

---

## Validation Strategy

### Zod as Primary Validation Layer

**CRITICAL:** All input validation MUST use Zod schemas. This provides:

- ✅ Type inference (TypeScript types auto-generated from schemas)
- ✅ Runtime validation (catch errors before they reach business logic)
- ✅ Composable schemas (reuse primitives across endpoints)
- ✅ Better error messages (detailed validation failures)
- ✅ Framework-agnostic (works outside NestJS controllers)

### Validation Layers

```
Incoming Request
    ↓
1. Zod Schema Validation (DTO layer)
    ↓
2. Business Logic Validation (Domain layer)
    ↓
3. Database Constraints (Infrastructure layer)
```

### When to Use Each Validation Tool

**Use Zod for:**

- ✅ ALL API request validation (DTOs)
- ✅ Environment variable validation
- ✅ Configuration validation
- ✅ External API response validation
- ✅ Protocol contract data validation
- ✅ Any input from untrusted sources

**Use class-validator for:**

- ⚠️ NestJS-specific decorators only (@IsOptional, @Transform)
- ⚠️ ONLY when Zod can't handle it (rare)

**Use domain validation for:**

- ✅ Business rules (e.g., "health factor must be > 1.0")
- ✅ Complex multi-field validation
- ✅ Stateful validation (requires database lookup)

### Zod Schema Location

```
shared/domain/schemas/          # Shared primitives
├── address.schema.ts
├── chain.schema.ts
├── token-amount.schema.ts
├── hex.schema.ts
└── index.ts

modules/positions/application/schemas/  # Feature-specific
├── get-position.schema.ts
├── track-position.schema.ts
└── index.ts
```

### Example: Complete Validation Flow

```typescript
// 1. Define Zod schema (shared/domain/schemas/address.schema.ts)
import { z } from 'zod';
import { isAddress } from 'ethers';

export const AddressSchema = z
  .string()
  .refine(isAddress, { message: 'Invalid Ethereum address' })
  .transform((val) => val.toLowerCase());

export type Address = z.infer<typeof AddressSchema>;

// 2. Define request schema (modules/positions/application/schemas/)
import { z } from 'zod';
import { AddressSchema } from '@/shared/domain/schemas/address.schema';
import { ChainSchema } from '@/shared/domain/schemas/chain.schema';

export const GetPositionQuerySchema = z.object({
  chain: ChainSchema,
  protocol: z.string().optional(),
});

export type GetPositionQuery = z.infer<typeof GetPositionQuerySchema>;

// 3. Use in DTO with NestJS integration
import { createZodDto } from '@anatine/zod-nestjs';
import { GetPositionQuerySchema } from '../schemas/get-position.schema';

export class GetPositionQueryDto extends createZodDto(GetPositionQuerySchema) {}

// 4. Use in controller
@Get(':address')
async getPosition(
  @Param('address') address: string,
  @Query() query: GetPositionQueryDto,
): Promise<PositionResponseDto> {
  // address and query are already validated and typed!
  const position = await this.positionService.getPosition(address, query.chain);
  return new PositionResponseDto(position);
}

// 5. Validate manually in services/use-cases
import { AddressSchema } from '@/shared/domain/schemas/address.schema';

async function processPosition(rawAddress: unknown) {
  // Validate and get typed value in one step
  const address = AddressSchema.parse(rawAddress);

  // address is now type 'string' and guaranteed valid
  return this.repository.findByAddress(address);
}
```

### Common Zod Patterns

**See `agents/CONVENTIONS.md` for complete Zod patterns and examples.**

---

## Code Conventions

> **See `agents/CONVENTIONS.md` for complete style guide**

### File Naming

| Type         | Pattern                          | Example                    |
| ------------ | -------------------------------- | -------------------------- |
| Controller   | `[feature].controller.ts`        | `position.controller.ts`   |
| Service      | `[feature].service.ts`           | `position.service.ts`      |
| Repository   | `[feature].repository.ts`        | `position.repository.ts`   |
| Entity       | `[feature].entity.ts`            | `position.entity.ts`       |
| Value Object | `[name].vo.ts`                   | `health-factor.vo.ts`      |
| DTO          | `[action]-[feature].dto.ts`      | `create-position.dto.ts`   |
| Use Case     | `[action]-[feature].use-case.ts` | `get-position.use-case.ts` |
| Adapter      | `[protocol].adapter.ts`          | `compound.adapter.ts`      |
| Module       | `[feature].module.ts`            | `position.module.ts`       |
| Test         | `[filename].spec.ts`             | `position.service.spec.ts` |
| E2E Test     | `[feature].e2e-spec.ts`          | `position.e2e-spec.ts`     |

### Import Order

```typescript
// 1. Node.js built-ins
import { createHash } from "crypto";
import { readFile } from "fs/promises";

// 2. External dependencies
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ethers } from "ethers";

// 3. Shared modules (using @/ alias)
import { Address } from "@/shared/domain/value-objects/address.vo";
import { Chain } from "@/shared/domain/value-objects/chain.vo";
import { RPCClient } from "@/shared/infrastructure/blockchain/rpc-client.service";

// 4. Module-relative imports
import { Position } from "../domain/entities/position.entity";
import { HealthFactor } from "../domain/value-objects/health-factor.vo";
import { PositionRepository } from "../infrastructure/persistence/position.repository";
```

### TypeScript Conventions

```typescript
// ✅ ALWAYS use strict mode
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

// ✅ Use explicit types
function calculateHealthFactor(collateral: bigint, debt: bigint): number {
  return Number(collateral) / Number(debt);
}

// ❌ Avoid 'any'
function process(data: any) { } // BAD

// ✅ Use 'unknown' when type is truly unknown
function process(data: unknown) {
  if (typeof data === 'string') {
    // Now TypeScript knows it's a string
  }
}

// ✅ Use readonly for immutable data
class Position {
  constructor(
    public readonly address: Address,
    public readonly supplied: bigint,
    public readonly borrowed: bigint,
  ) {}
}

// ✅ Use BigInt for token amounts (NEVER Number)
const tokenAmount: bigint = 1000000000000000000n; // 1 token with 18 decimals

// ❌ NEVER use Number for token amounts (precision loss)
const tokenAmount: number = 1000000000000000000; // BAD - loses precision
```

### NestJS Patterns

```typescript
// ✅ Use dependency injection
@Injectable()
export class PositionService {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly compoundAdapter: CompoundAdapter,
  ) {}
}

// ✅ Use decorators for validation
export class CreatePositionDto {
  @IsEthereumAddress()
  @ApiProperty({ example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' })
  address: string;

  @IsEnum(Chain)
  @ApiProperty({ enum: Chain })
  chain: Chain;

  @IsPositive()
  @ApiProperty({ example: '1000000000000000000' })
  amount: string; // BigInt as string
}

// ✅ Use proper HTTP status codes
@Post()
@HttpCode(HttpStatus.CREATED)
async create(@Body() dto: CreatePositionDto) {
  return this.positionService.create(dto);
}

// ✅ Use ApiProperty for Swagger documentation
@ApiProperty({
  description: 'User wallet address',
  example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
})
address: string;
```

### DeFi-Specific Conventions

```typescript
// ✅ ALWAYS use BigInt for token amounts
const amount: bigint = ethers.parseUnits("1.5", 18); // 1.5 tokens

// ✅ Store addresses in lowercase
const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb".toLowerCase();

// ✅ Use ethers.js v6 (NOT v5, NOT web3.js)
import { ethers } from "ethers";

// ✅ Handle decimal places correctly
function formatTokenAmount(amount: bigint, decimals: number): string {
  return ethers.formatUnits(amount, decimals);
}

// ✅ Always validate addresses
import { isAddress } from "ethers";

if (!isAddress(userAddress)) {
  throw new BadRequestException("Invalid Ethereum address");
}

// ✅ Use correct contract ABIs
import { CompoundV3ABI } from "@/contracts/abis/compound-v3.abi";

// ✅ Handle reorgs and failed transactions
try {
  const tx = await contract.supply(amount);
  await tx.wait(2); // Wait for 2 confirmations
} catch (error) {
  // Handle reorg or failure
}
```

---

## Testing Strategy

### Test Structure

```
modules/positions/
├── __tests__/
│   ├── unit/
│   │   ├── position.service.spec.ts
│   │   ├── position-calculator.service.spec.ts
│   │   └── health-factor.vo.spec.ts
│   ├── integration/
│   │   ├── position-repository.integration.spec.ts
│   │   └── compound-adapter.integration.spec.ts
│   └── e2e/
│       └── position.e2e-spec.ts
└── mocks/
    ├── position.mock.ts
    └── compound-response.mock.json
```

### Unit Test Example

```typescript
// modules/positions/__tests__/unit/health-factor.vo.spec.ts
import { HealthFactor } from "../../domain/value-objects/health-factor.vo";

describe("HealthFactor", () => {
  describe("constructor", () => {
    it("should calculate health factor correctly", () => {
      const collateral = 10000n * 10n ** 18n; // $10,000
      const borrowed = 5000n * 10n ** 18n; // $5,000
      const liquidationFactor = 0.75;

      const healthFactor = new HealthFactor(
        collateral,
        borrowed,
        liquidationFactor
      );

      // (10000 * 0.75) / 5000 = 1.5
      expect(healthFactor.getValue()).toBe(1.5);
    });

    it("should return Infinity when borrowed is zero", () => {
      const healthFactor = new HealthFactor(10000n, 0n, 0.75);
      expect(healthFactor.getValue()).toBe(Infinity);
    });
  });

  describe("isHealthy", () => {
    it("should return true when health factor >= 1.5", () => {
      const healthFactor = new HealthFactor(
        10000n * 10n ** 18n,
        5000n * 10n ** 18n,
        0.75
      );
      expect(healthFactor.isHealthy()).toBe(true);
    });

    it("should return false when health factor < 1.5", () => {
      const healthFactor = new HealthFactor(
        10000n * 10n ** 18n,
        7000n * 10n ** 18n,
        0.75
      );
      expect(healthFactor.isHealthy()).toBe(false);
    });
  });

  describe("getRiskLevel", () => {
    it("should return HEALTHY when >= 1.5", () => {
      const healthFactor = new HealthFactor(
        10000n * 10n ** 18n,
        5000n * 10n ** 18n,
        0.75
      );
      expect(healthFactor.getRiskLevel()).toBe("HEALTHY");
    });

    it("should return AT_RISK when >= 1.0 and < 1.5", () => {
      const healthFactor = new HealthFactor(
        10000n * 10n ** 18n,
        6000n * 10n ** 18n,
        0.75
      );
      expect(healthFactor.getRiskLevel()).toBe("AT_RISK");
    });

    it("should return LIQUIDATABLE when < 1.0", () => {
      const healthFactor = new HealthFactor(
        10000n * 10n ** 18n,
        8000n * 10n ** 18n,
        0.75
      );
      expect(healthFactor.getRiskLevel()).toBe("LIQUIDATABLE");
    });
  });
});
```

### Integration Test Example

```typescript
// modules/positions/__tests__/integration/position-repository.integration.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PositionRepository } from "../../infrastructure/persistence/position.repository";
import { Position } from "../../domain/entities/position.entity";

describe("PositionRepository Integration", () => {
  let repository: PositionRepository;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "postgres",
          host: "localhost",
          port: 5432,
          database: "test_db",
          entities: [Position],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Position]),
      ],
      providers: [PositionRepository],
    }).compile();

    repository = module.get<PositionRepository>(PositionRepository);
  });

  afterAll(async () => {
    await module.close();
  });

  it("should save and retrieve position", async () => {
    const position = repository.create({
      address: "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
      chain: "ethereum",
      protocol: "compound-v3",
      supplied: 1000000000000000000n,
      borrowed: 500000000000000000n,
    });

    const saved = await repository.save(position);
    expect(saved.id).toBeDefined();

    const found = await repository.findOne({ where: { id: saved.id } });
    expect(found).toBeDefined();
    expect(found.address).toBe(position.address);
  });
});
```

### E2E Test Example

```typescript
// modules/positions/__tests__/e2e/position.e2e-spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "@/app.module";

describe("PositionController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/positions/:address (GET)", () => {
    it("should return position for valid address", () => {
      return request(app.getHttpServer())
        .get("/positions/0x742d35cc6634c0532925a3b844bc9e7595f0beb")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("address");
          expect(res.body).toHaveProperty("supplied");
          expect(res.body).toHaveProperty("borrowed");
          expect(res.body).toHaveProperty("healthFactor");
        });
    });

    it("should return 400 for invalid address", () => {
      return request(app.getHttpServer())
        .get("/positions/invalid-address")
        .expect(400);
    });
  });
});
```

### Test Coverage Requirements

- **Unit tests:** ≥ 80% coverage
- **Integration tests:** All repositories and adapters
- **E2E tests:** All critical API endpoints
- **Run tests before every commit** (use git hooks)

---

## Common Patterns

### Pattern 1: Protocol Adapter

**Use when:** Integrating with external DeFi protocols (Compound, Morpho, Aave)

```typescript
// modules/positions/infrastructure/blockchain/compound.adapter.ts
import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";
import { RPCClient } from "@/shared/infrastructure/blockchain/rpc-client.service";
import { CompoundV3ABI } from "@/contracts/abis/compound-v3.abi";
import { Address } from "@/shared/domain/value-objects/address.vo";

export interface ProtocolAdapter {
  getPosition(address: Address): Promise<{
    supplied: bigint;
    borrowed: bigint;
    collateral: bigint;
  }>;
}

@Injectable()
export class CompoundAdapter implements ProtocolAdapter {
  private readonly contract: ethers.Contract;

  constructor(private readonly rpcClient: RPCClient) {
    this.contract = new ethers.Contract(
      "0xc3d688B66703497DAA19211EEdff47f25384cdc3", // Compound V3 USDC
      CompoundV3ABI,
      this.rpcClient.getProvider("ethereum")
    );
  }

  async getPosition(address: Address) {
    const [basicData, collateralData] = await Promise.all([
      this.contract.userBasic(address),
      this.getUserCollateral(address),
    ]);

    return {
      supplied: basicData.principal > 0 ? BigInt(basicData.principal) : 0n,
      borrowed: basicData.principal < 0 ? BigInt(-basicData.principal) : 0n,
      collateral: collateralData,
    };
  }

  private async getUserCollateral(address: Address): Promise<bigint> {
    // Fetch all collateral assets
    const numAssets = await this.contract.numAssets();
    let totalCollateral = 0n;

    for (let i = 0; i < numAssets; i++) {
      const assetInfo = await this.contract.getAssetInfo(i);
      const balance = await this.contract.userCollateral(
        address,
        assetInfo.asset
      );
      totalCollateral += BigInt(balance);
    }

    return totalCollateral;
  }
}
```

### Pattern 2: Repository Pattern

**Use when:** Accessing database

```typescript
// modules/positions/infrastructure/persistence/position.repository.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Position } from "../../domain/entities/position.entity";
import { Address } from "@/shared/domain/value-objects/address.vo";

@Injectable()
export class PositionRepository {
  constructor(
    @InjectRepository(Position)
    private readonly repository: Repository<Position>
  ) {}

  async findByAddress(address: Address): Promise<Position[]> {
    return this.repository.find({
      where: { address: address.toLowerCase() },
      order: { createdAt: "DESC" },
    });
  }

  async findLatest(
    address: Address,
    protocol: string
  ): Promise<Position | null> {
    return this.repository.findOne({
      where: { address: address.toLowerCase(), protocol },
      order: { createdAt: "DESC" },
    });
  }

  async save(position: Position): Promise<Position> {
    return this.repository.save(position);
  }

  create(data: Partial<Position>): Position {
    return this.repository.create(data);
  }
}
```

### Pattern 3: Use Case Pattern

**Use when:** Complex business operations that involve multiple steps

```typescript
// modules/positions/application/use-cases/track-position.use-case.ts
import { Injectable } from "@nestjs/common";
import { Address } from "@/shared/domain/value-objects/address.vo";
import { PositionRepository } from "../../infrastructure/persistence/position.repository";
import { CompoundAdapter } from "../../infrastructure/blockchain/compound.adapter";
import { PositionCalculatorService } from "../../domain/services/position-calculator.service";
import { NotificationService } from "@/shared/infrastructure/notifications/notification.service";

@Injectable()
export class TrackPositionUseCase {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly compoundAdapter: CompoundAdapter,
    private readonly calculator: PositionCalculatorService,
    private readonly notifications: NotificationService
  ) {}

  async execute(address: Address, protocol: string): Promise<void> {
    // 1. Fetch current position from blockchain
    const blockchainData = await this.compoundAdapter.getPosition(address);

    // 2. Calculate health metrics
    const healthFactor = this.calculator.calculateHealthFactor(
      blockchainData.collateral,
      blockchainData.borrowed,
      0.75 // liquidation factor
    );

    // 3. Save to database
    const position = this.positionRepository.create({
      address,
      protocol,
      ...blockchainData,
    });
    await this.positionRepository.save(position);

    // 4. Send alerts if at risk
    if (healthFactor.isLiquidatable()) {
      await this.notifications.sendAlert({
        level: "critical",
        message: `Position ${address} is liquidatable!`,
        data: { address, healthFactor: healthFactor.getValue() },
      });
    } else if (healthFactor.isAtRisk()) {
      await this.notifications.sendAlert({
        level: "warning",
        message: `Position ${address} is at risk`,
        data: { address, healthFactor: healthFactor.getValue() },
      });
    }
  }
}
```

### Pattern 4: Value Object Pattern

**Use when:** Representing immutable domain concepts

```typescript
// shared/domain/value-objects/address.vo.ts
import { isAddress, getAddress } from "ethers";

export class Address {
  private readonly value: string;

  constructor(address: string) {
    if (!isAddress(address)) {
      throw new Error(`Invalid Ethereum address: ${address}`);
    }
    // Store checksummed address
    this.value = getAddress(address);
  }

  toString(): string {
    return this.value;
  }

  toLowerCase(): string {
    return this.value.toLowerCase();
  }

  equals(other: Address): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  static fromString(address: string): Address {
    return new Address(address);
  }
}
```

### Pattern 5: Caching Pattern

**Use when:** Expensive operations need caching

```typescript
// modules/positions/infrastructure/cache/position-cache.service.ts
import { Injectable } from "@nestjs/common";
import { CacheService } from "@/shared/infrastructure/cache/cache.service";
import { Position } from "../../domain/entities/position.entity";

@Injectable()
export class PositionCacheService {
  constructor(private readonly cache: CacheService) {}

  async get(key: string): Promise<Position | null> {
    const cached = await this.cache.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(
    key: string,
    position: Position,
    ttlSeconds: number
  ): Promise<void> {
    await this.cache.set(key, JSON.stringify(position), ttlSeconds);
  }

  async invalidate(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.cache.keys(pattern);
    if (keys.length > 0) {
      await this.cache.del(...keys);
    }
  }
}
```

---

## External Integrations

### DeFi Protocol Integration

**When integrating with external DeFi protocols (Compound, Morpho, Aave):**

1. **Download protocol documentation:**

```bash
   npm run docs:sync  # Fetches llms.txt files
```

2. **Read protocol docs:**

```
   Reference: docs/protocols/morpho/llms-full.txt
```

3. **Create adapter:**

```typescript
// modules/positions/infrastructure/blockchain/morpho.adapter.ts
```

4. **Follow protocol patterns from llms.txt:**
   - Contract addresses
   - ABI interfaces
   - Calculation formulas
   - Common gotchas

5. **Add tests with real contract data:**

```typescript
// Use known addresses with positions for testing
const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
```

### Indexer Integration (Ponder)

**When using indexed blockchain data:**

```typescript
// modules/positions/infrastructure/indexer/ponder-client.service.ts
import { Injectable } from "@nestjs/common";
import { Client, credentials } from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";

@Injectable()
export class PonderClient {
  private client: any;

  constructor() {
    const packageDefinition = loadSync("proto/indexer.proto");
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

    this.client = new protoDescriptor.indexer.IndexerService(
      "ponder-indexer:50051",
      credentials.createInsecure()
    );
  }

  async getPosition(address: string, protocol: string) {
    return new Promise((resolve, reject) => {
      this.client.getPosition({ address, protocol }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }
}
```

### External API Integration

**When calling external APIs (LiFi, OKX, aggregators):**

```typescript
// modules/swaps/infrastructure/aggregators/lifi.adapter.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class LiFiAdapter {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = config.get("LIFI_API_URL");
    this.apiKey = config.get("LIFI_API_KEY");
  }

  async getQuote(params: {
    fromChain: string;
    toChain: string;
    fromToken: string;
    toToken: string;
    fromAmount: string;
  }) {
    const response = await fetch(`${this.apiUrl}/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-lifi-api-key": this.apiKey,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`LiFi API error: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### Input Validation Checklist

Before implementing any endpoint or service:

- [ ] Define Zod schema in `schemas/` directory
- [ ] Export both schema and inferred type
- [ ] Use primitive schemas from `shared/domain/schemas/`
- [ ] Create NestJS DTO using `createZodDto()`
- [ ] Add Swagger documentation via `@ApiProperty()`
- [ ] Test schema with valid and invalid inputs
- [ ] Handle ZodError in try-catch blocks

**Example workflow:**

```bash
# 1. Create schema file
touch src/modules/positions/application/schemas/track-position.schema.ts

# 2. Define schema with primitives
# (see CONVENTIONS.md for examples)

# 3. Create DTO from schema
touch src/modules/positions/application/dtos/track-position.dto.ts

# 4. Use in controller
# (automatic validation via ZodValidationPipe)

# 5. Test validation
npm run test:e2e -- --testNamePattern="track position validation"
```

---

## Development Workflow

**Foundation vs derived projects:** This foundation repo includes only a subset of scripts (e.g. `lint`, `format`, `type-check`). Scripts like `docs:sync`, `test:debug`, and migration commands are for **derived projects**—add them in your app when you create a project from this foundation.

### Starting a New Feature

```bash
# 1. Create feature branch
git checkout -b feat/morpho-integration

# 2. Determine module complexity
# Simple (health) | Standard (vendors) | Complex (positions)

# 3. Create module directory
mkdir -p src/modules/morpho-positions

# 4. Create module structure based on complexity
# For complex module:
mkdir -p src/modules/morpho-positions/{domain,application,infrastructure,api}/__tests__

# 5. Create module file
touch src/modules/morpho-positions/morpho-positions.module.ts

# 6. Create README
touch src/modules/morpho-positions/README.md

# 7. Start development
# Create files as needed following templates above

# 8. Write tests as you develop
# ✅ ALWAYS write tests alongside implementation

# 9. Run tests frequently
npm run test:watch

# 10. Commit with conventional commits
git commit -m "feat(morpho): add position tracking"

# 11. Push and create PR
git push origin feat/morpho-integration
```

### Adding Protocol Integration

```bash
# 1. Sync protocol documentation
npm run docs:sync

# 2. Read protocol llms.txt
cat docs/protocols/morpho/llms-full.txt

# 3. Create adapter following protocol patterns
touch src/modules/positions/infrastructure/blockchain/morpho.adapter.ts

# 4. Implement following examples from llms-full.txt

# 5. Add tests with real contract addresses
touch src/modules/positions/__tests__/integration/morpho-adapter.integration.spec.ts

# 6. Test against testnet first
CHAIN=base-sepolia npm test

# 7. Test against mainnet (read-only)
CHAIN=base npm test
```

### Running the Project

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Tests
npm run test              # Unit tests
npm run test:watch        # Watch mode
npm run test:cov          # With coverage
npm run test:integration  # Integration tests
npm run test:e2e          # E2E tests

# Database
npm run migration:generate -- src/database/migrations/my-migration
npm run migration:run
npm run migration:revert

# Code quality
npm run lint              # ESLint
npm run format            # Prettier
npm run type-check        # TypeScript
```

### Git Commit Convention

**Format:**

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `docs`: Documentation
- `chore`: Maintenance

**Scopes:**

- Module names: `positions`, `vendors`, `health`
- Infrastructure: `database`, `cache`, `rpc`
- Config: `docker`, `ci`, `deps`

**Examples:**

```bash
feat(positions): add Morpho Blue position tracking
fix(compound): correct health factor decimal handling
refactor(shared): extract address validation to value object
perf(cache): implement Redis pipelining for batch operations
test(positions): add integration tests for Compound adapter
docs(morpho): add protocol integration guide
chore(deps): update ethers.js to v6.10.0
```

---

## Troubleshooting

### Common Issues

#### Issue: "Cannot find module '@/shared/...'"

**Solution:** Check `tsconfig.json` path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### Issue: "BigInt serialization error"

**Solution:** Use custom JSON stringifier:

```typescript
import { stringifyWithBigInt } from "@/shared/utils/stringify-with-bigint";

const json = stringifyWithBigInt({ amount: 1000000000000000000n });
```

#### Issue: "RPC call failed"

**Solution:** Check RPC provider configuration and fallback:

```typescript
// shared/infrastructure/blockchain/rpc-client.service.ts
// Implements automatic fallback to secondary RPC
```

#### Issue: "Position calculation incorrect"

**Solution:** Verify decimal places:

```typescript
// ✅ Correct: Use BigInt for all calculations
const amount = ethers.parseUnits("1.5", 18); // 1.5 tokens

// ❌ Wrong: Using Number (precision loss)
const amount = 1.5 * 1e18; // Loses precision
```

#### Issue: "Tests fail on CI but pass locally"

**Solution:** Check for:

- Environment variables (use `.env.test`)
- Time-dependent tests (mock `Date.now()`)
- Network-dependent tests (mock RPC calls)
- Database state (ensure clean state before each test)

### Getting Help

1. **Check module README:**

```bash
   cat src/modules/positions/README.md
```

2. **Check protocol documentation:**

```bash
   cat docs/protocols/morpho/llms-full.txt
```

3. **Check architecture docs:**

```bash
   cat agents/ARCHITECTURE.md
```

4. **Check existing examples:**

```bash
   # Find similar implementations
   grep -r "similar-pattern" src/modules/
```

5. **Run diagnostics:**

```bash
   npm run test:debug
   npm run lint
   npm run type-check
```

---

## AI Agent Guidelines

### When Creating New Code

1. **Read module README first** (if it exists)
2. **Check complexity level** (simple/standard/complex)
3. **Follow existing patterns** in similar modules
4. **Use shared infrastructure** (don't reinvent)
5. **Write tests** alongside implementation
6. **Update README** if adding significant features

### When Modifying Existing Code

1. **Understand the module** (read README)
2. **Respect layer boundaries** (don't break dependency rules)
3. **Maintain consistency** with existing code style
4. **Update tests** for modified behavior
5. **Update docs** if behavior changes

### When Integrating External Protocols

1. **Sync documentation first:** `npm run docs:sync`
2. **Read llms-full.txt** for the protocol
3. **Follow protocol patterns** exactly
4. **Use correct contract addresses** from docs
5. **Test with known addresses** (e.g., Vitalik's wallet)
6. **Handle edge cases** mentioned in docs

### Quality Checklist

Before committing, verify:

- [ ] Code follows naming conventions
- [ ] All imports are organized correctly
- [ ] No `any` types used
- [ ] BigInt used for token amounts
- [ ] Addresses stored in lowercase
- [ ] Tests written and passing
- [ ] No console.log statements
- [ ] Swagger documentation updated
- [ ] README updated if needed
- [ ] Conventional commit message

---

## Related Documentation

- **Code Conventions:** `agents/CONVENTIONS.md`
- **Architecture Details:** `agents/ARCHITECTURE.md`
- **Module Guides:** `agents/modules/*.md`
- **Protocol Integrations:** `docs/protocols/*/llms-full.txt`

---

## Changelog

- **2026-01-31:** Initial version
- **Future:** Will be updated as patterns evolve

---

**For questions or improvements to this guide, create an issue or submit a PR.**
