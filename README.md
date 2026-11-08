# Cloud Security Intelligence

<p align="center">
  <strong>A cloud security intelligence platform for discovering cloud resources, identifying configuration risks, and building toward unified multi-cloud security visibility.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active%20Development-0f766e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Features](#features)
- [Current Implementation Status](#current-implementation-status)
- [Application Screenshots](#application-screenshots)
- [Security Detection Engine](#security-detection-engine)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Testing and Build](#testing-and-build)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Author](#author)

---

## Overview

**Cloud Security Intelligence** is an actively developed cloud security platform designed to manage cloud account records, discover cloud resources, and evaluate resource configurations against predefined security rules.

The project aims to provide a centralized workspace for understanding cloud infrastructure security risks and eventually supporting multi-cloud security visibility.

### Core Workflow

1. Register a cloud provider account.
2. Discover resources associated with the account.
3. Maintain a centralized resource inventory.
4. Execute security checks against discovered resources.
5. Identify configuration risks and generate findings.
6. Persist findings for further analysis and future remediation workflows.

> **Implementation status:** The current Azure discovery adapter uses simulated development data. It does not authenticate to or inspect a live Azure subscription. AWS and GCP account records are supported, but their discovery adapters are not implemented.

## Problem Statement

Cloud environments contain numerous resources, configurations, identities, and network permissions. Misconfigurations can expose infrastructure to unnecessary security risks.

This project explores how a centralized security intelligence platform can help:

- Organize cloud account information.
- Maintain visibility into discovered resources.
- Detect selected insecure configurations.
- Store security findings with supporting evidence.
- Provide a foundation for future multi-cloud security analysis.

## Features

### 1. Cloud Account Management

- Register cloud account records.
- List and retrieve registered accounts.
- Activate and deactivate accounts.
- Maintain provider-specific account information.
- Support Azure, AWS, and GCP account records.

### 2. Resource Discovery

- Provider adapter architecture.
- Simulated Azure resource discovery.
- Associate discovered resources with cloud accounts.
- Store resource metadata for security evaluation.

### 3. Resource Inventory

- Centralized resource listing.
- Resource filtering and pagination.
- Resource details retrieval.
- Cloud provider and discovery-source information.
- Development resource inventory visibility.

### 4. Security Detection Engine

- Rule-based configuration evaluation.
- Security severity classification.
- Evidence and remediation guidance.
- Scan results persisted in PostgreSQL.
- Repeated scans update matching findings.

### 5. Backend Infrastructure

- REST API built with Express.
- Request validation with Zod.
- PostgreSQL persistence.
- Prisma ORM.
- Docker Compose development infrastructure.
- Redis provisioned for future application workflows.

## Current Implementation Status

| Component | Status |
|---|---|
| Cloud account management API | Implemented |
| Azure account records | Implemented |
| AWS account records | Implemented |
| GCP account records | Implemented |
| Azure simulated discovery | Implemented |
| Live Azure discovery | Planned |
| AWS discovery integration | Planned |
| GCP discovery integration | Planned |
| Resource inventory API | Implemented |
| Rule-based security evaluation | Implemented |
| Finding persistence | Implemented |
| Cloud account management UI | Available |
| Resource inventory UI | Available |
| Security Findings UI | Not yet available |
| IAM intelligence | Planned |
| Attack path analysis | Planned |
| Compliance management | Planned |
| Automated remediation | Planned |

---

## Application Screenshots

### Cloud Account Management

Manage registered cloud environments and monitor account status through the application workspace.

![Cloud Account Management](./cloud-accounts.png)

### Resource Inventory

Explore discovered cloud resources and review their provider, type, region, account association, and discovery source.

The current Azure discovery adapter uses simulated development data.

![Resource Inventory](./resource-inventory.png)

---

## Security Detection Engine

The security detection engine evaluates discovered resources against predefined security rules to identify selected configuration risks.

### Implemented Security Rules

| Rule ID | Security Check | Severity |
|---|---|---|
| `AZ-STORAGE-001` | Detects publicly accessible storage resources | HIGH |
| `AZ-NSG-001` | Detects network security groups allowing SSH (port 22) from any source | CRITICAL |

### Finding Information

The detection workflow supports findings containing:

- Rule identifier.
- Finding title and description.
- Severity classification.
- Supporting evidence.
- Remediation guidance.
- Associated cloud resource.

### Security Scanning Workflow

1. Select a registered cloud account.
2. Trigger a security scan through the API.
3. Evaluate discovered resources against implemented security rules.
4. Generate findings for matching configurations.
5. Persist findings in PostgreSQL.
6. Update matching findings during repeated scans.

### Security Scan Endpoint

```http
POST /api/security/scan/:cloudAccountId
```

> Security results currently demonstrate rule evaluation against simulated resource metadata. They should not be interpreted as live cloud security assessments.

---

## Architecture

The project follows a modular architecture separating the frontend, backend API, discovery services, security evaluation, and database persistence.

### System Architecture

```mermaid
flowchart TD
    USER[User]
    WEB[Next.js Web Application]
    API[Express REST API]

    subgraph Backend
        AC[Cloud Account Routes]
        RES[Resource Routes]
        SCAN[Security Scan Routes]
        DISC[Discovery Service]
        AZ[Azure Simulated Adapter]
        ENGINE[Security Rules Engine]
    end

    DB[(PostgreSQL)]
    REDIS[(Redis Infrastructure)]

    USER --> WEB
    WEB --> API

    API --> AC
    API --> RES
    API --> SCAN

    AC --> DB
    RES --> DISC
    DISC --> AZ
    AZ --> DB

    SCAN --> ENGINE
    ENGINE --> DB

    DB --> FINDINGS[Persisted Security Findings]
```

### Main Components

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js, React | Application interface |
| Styling | Tailwind CSS | UI styling |
| Backend | Node.js, Express | REST API and business logic |
| Validation | Zod | Request validation |
| Database | PostgreSQL | Persistent application data |
| ORM | Prisma | Database access |
| Discovery | Provider adapters | Cloud resource discovery |
| Security engine | TypeScript | Rule-based evaluation |
| Infrastructure | Docker Compose | Local service orchestration |
| Cache infrastructure | Redis | Provisioned for future workflows |

**Architecture note:** Redis is provisioned through Docker Compose. Application-level Redis workflows are not yet implemented.

### Data Flow

1. The user interacts with the Next.js application.
2. The frontend communicates with the Express API.
3. The API processes cloud account and resource operations.
4. The discovery service invokes the configured provider adapter.
5. The security engine evaluates available resource metadata.
6. Security findings are stored in PostgreSQL.

---

## Technology Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express 5
- TypeScript
- Zod

### Database and Infrastructure

- PostgreSQL 16
- Prisma ORM
- Redis 7
- Docker
- Docker Compose

### Development and Testing

- Git
- GitHub
- npm workspaces
- Vitest

<p align="center">
  <img src="https://skillicons.dev/icons?i=typescript,nextjs,react,nodejs,express,postgres,redis,prisma,docker,tailwind&theme=dark" />
</p>

---

## Repository Structure

```text
cloud-security-intelligence/
│
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   └── schema.prisma
│   │   │
│   │   └── src/
│   │       ├── discovery/
│   │       ├── routes/
│   │       ├── security/
│   │       ├── __tests__/
│   │       ├── db.ts
│   │       └── server.ts
│   │
│   └── web/
│       └── src/
│           ├── app/
│           ├── components/
│           ├── hooks/
│           └── lib/
│
├── docs/
│
├── docker-compose.yml
├── package.json
└── package-lock.json
```

---

## Getting Started

Follow these instructions to run the project locally.

### Prerequisites

Install the following tools:

- Node.js
- npm
- Docker Desktop
- Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/manjunath-novus/cloud-security-intelligence.git

cd cloud-security-intelligence
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the repository root.

Example local development configuration:

```env
POSTGRES_USER=cloudsec
POSTGRES_PASSWORD=change-this-local-password
POSTGRES_DB=cloud_security_intelligence
POSTGRES_PORT=5432

REDIS_PORT=6379

DATABASE_URL=postgresql://cloudsec:change-this-local-password@localhost:5432/cloud_security_intelligence

PORT=5000
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Use your own local database password and make sure the database URL matches your Docker Compose configuration.

**Important:** Do not commit `.env` files, passwords, API keys, or cloud credentials to GitHub.

### 4. Start Infrastructure

Start PostgreSQL and Redis using Docker Compose:

```bash
docker compose up -d
```

Check the running containers:

```bash
docker compose ps
```

### 5. Generate Prisma Client

Run the following commands from the API application directory:

```bash
cd apps/api

npx prisma generate --config prisma.config.ts
```

### 6. Run Database Migrations

```bash
npx prisma migrate dev --config prisma.config.ts
```

Return to the repository root:

```bash
cd ../..
```

### 7. Start the Backend API

Open a terminal in the repository root:

```bash
npm run dev:api
```

The backend API is configured to run at:

```text
http://localhost:5000
```

### 8. Start the Frontend

Open another terminal in the repository root:

```bash
npm run dev
```

Open the application:

```text
http://localhost:3000
```

### Local Services

| Service | Address |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| API health | http://localhost:5000/health |
| Database health | http://localhost:5000/health/database |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## API Reference

The backend exposes REST endpoints for health monitoring, cloud account management, resource operations, discovery, and security scanning.

### Health Checks

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | API health status |
| GET | `/health/database` | Database connectivity status |

### Cloud Account Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/cloud-accounts` | Register a cloud account |
| GET | `/api/cloud-accounts` | List cloud accounts |
| GET | `/api/cloud-accounts/:id` | Retrieve a cloud account |
| PATCH | `/api/cloud-accounts/:id/activate` | Activate an account |
| PATCH | `/api/cloud-accounts/:id/deactivate` | Deactivate an account |

### Resource Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/resources` | Register a resource |
| GET | `/api/resources` | List resources |
| GET | `/api/resources/:id` | Retrieve resource details |
| POST | `/api/resources/discover/:cloudAccountId` | Discover account resources |

### Security Scanning

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/security/scan/:cloudAccountId` | Execute a security scan |

### Example: Health Check

```bash
curl http://localhost:5000/health
```

### Example: List Cloud Accounts

```bash
curl http://localhost:5000/api/cloud-accounts
```

### Example: Trigger Resource Discovery

```bash
curl -X POST http://localhost:5000/api/resources/discover/YOUR_CLOUD_ACCOUNT_ID
```

### Example: Trigger Security Scan

```bash
curl -X POST http://localhost:5000/api/security/scan/YOUR_CLOUD_ACCOUNT_ID
```

Replace `YOUR_CLOUD_ACCOUNT_ID` with an actual cloud account ID returned by the API.

---

## Testing and Build

The project uses Vitest for API testing.

### Run API Tests

```bash
npm test --workspace=apps/api
```

### Build the API

```bash
npm run build --workspace=apps/api
```

### Build the Web Application

```bash
npm run build --workspace=apps/web
```

Run these checks after installing dependencies and configuring the local environment.

---

## Troubleshooting

### PostgreSQL Connection Failure

- Check whether the PostgreSQL container is running.
- Run `docker compose ps`.
- Verify the `DATABASE_URL` value.
- Confirm the database credentials match your Docker Compose environment.

### Prisma Client Issues

From `apps/api`, regenerate the Prisma Client:

```bash
npx prisma generate --config prisma.config.ts
```

### Database Migration Issues

Check that PostgreSQL is running and that the database URL is correct before running:

```bash
npx prisma migrate dev --config prisma.config.ts
```

### Frontend Cannot Connect to Backend

Verify:

- The API server is running.
- The API is listening on port `5000`.
- `NEXT_PUBLIC_API_URL` is set to `http://localhost:5000`.
- The frontend has been restarted after changing environment variables.

### Docker Services Not Running

```bash
docker compose up -d
docker compose ps
```

---

## Security Considerations

Security is a central concern of this project.

Current development practices include:

- Keeping secrets outside source control.
- Using environment variables for local configuration.
- Validating API requests with Zod.
- Evaluating resource configurations using explicit security rules.
- Persisting findings for further investigation.

### Important Limitations

- Azure discovery currently uses simulated data.
- No live cloud credentials are required for the simulated discovery workflow.
- AWS and GCP discovery integrations are not yet implemented.
- Security results are not a substitute for a production cloud security assessment.
- Automated remediation is not currently available.

---

## Roadmap

The following features represent planned development, not completed functionality.

### Phase 1 — Core Platform

- [x] Cloud account management
- [x] Simulated Azure resource discovery
- [x] Resource inventory
- [x] Rule-based security evaluation
- [x] PostgreSQL finding persistence
- [x] Initial application interface
- [x] API health checks

### Phase 2 — Security Intelligence

- [ ] Security Findings interface
- [ ] Finding lifecycle management
- [ ] Expanded security detection rules
- [ ] Improved evidence and remediation workflows
- [ ] Security summary and reporting

### Phase 3 — Multi-Cloud Integration

- [ ] Live Azure authentication and discovery
- [ ] AWS discovery adapter
- [ ] GCP discovery adapter
- [ ] Unified multi-cloud resource inventory
- [ ] Provider-specific security checks

### Phase 4 — Advanced Cloud Security

- [ ] IAM security analysis
- [ ] Identity and access risk detection
- [ ] Attack path analysis
- [ ] Compliance policy evaluation
- [ ] Security posture scoring
- [ ] Audit and activity reporting

### Phase 5 — Production Readiness

- [ ] Automated remediation workflows
- [ ] Background job processing
- [ ] Monitoring and observability
- [ ] Improved authentication and authorization
- [ ] Deployment automation
- [ ] Production security hardening

---

## Contributing

Contributions, suggestions, and feedback are welcome.

If you want to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run relevant tests and builds.
5. Submit a pull request with a clear description.

For significant changes, open an issue first to discuss the proposed implementation.

---

## Author

**Manjunath Halli**

Computer Science Engineering Student | Cloud Computing | Software Engineering | Security

- GitHub: [@manjunath-novus](https://github.com/manjunath-novus)
- Project: [Cloud Security Intelligence](https://github.com/manjunath-novus/cloud-security-intelligence)

---

<p align="center">
  <strong>Cloud Security Intelligence</strong>
  <br />
  Building toward unified cloud security visibility.
  <br /><br />
  <sub>Actively developed as an engineering portfolio project.</sub>
</p>
