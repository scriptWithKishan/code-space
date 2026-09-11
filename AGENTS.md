# AGENTS.md - System Prompt & Architecture Specification

Welcome to the **AI Code-Space** codebase. This document serves as the primary system prompt, architectural blueprint, and development guide for all AI agents and developers building and maintaining this platform.

---

## 🚀 Project Overview & Vision

**AI Code-Space** is an intelligent workspace platform designed for teams to organize projects, track tasks, and collaborate seamlessly. The standout capability of this platform is **Prompt-to-Action AI**: users can manage their entire workspace using natural language prompts.

### Key Capabilities:
1. **Workspace Management**: Multi-tenant workspace creation, workspace settings, member management with role-based access control (`ADMIN`, `MEMBER`, `VIEWER`).
2. **Project & Task Management**: Project creation, Kanban/List task boards, task assignments, priority tagging (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and status lifecycle management (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`).
3. **Prompt-to-Action AI Engine**: A natural language command engine powered by **Google Gemini API** (`@google/genai`) capable of executing single or multi-step operations (e.g., *"Create a project named Mobile App, add 3 tasks for user login, push notification, and profile page, and assign user login to Alex"*).
4. **Full JWT Authentication & Authorization**: Secure signup, login, JWT bearer token guards, and protected workspace routes.
5. **Real-Time WebSockets & Audit Logging**: Socket.IO gateway for real-time task updates across connected workspace members and historical audit logs of all AI-generated modifications.

---

## 🛠️ Repository Architecture & Tech Stack

This codebase is structured as a **Turborepo monorepo** managed with `pnpm`.

```text
code-space/
├── apps/
│   ├── backend/        # NestJS REST & WebSocket API (Port 4000)
│   │                   # Database: MongoDB Atlas via @nestjs/mongoose
│   │                   # AI: Google Gemini API (@google/genai)
│   │                   # Auth: Passport JWT + Bcrypt
│   │                   # Realtime: Socket.IO WebSockets
│   └── web/            # Next.js 16 (App Router) Frontend (Port 3000)
│                       # UI: Tailwind CSS, Lucide React, Cmd+K Modal, dnd-kit
├── packages/
│   ├── ui/             # Shared React component library
│   ├── typescript-config/ # Shared tsconfig bases
│   └── eslint-config/  # Shared ESLint rules
├── AGENTS.md           # System prompt & project instructions (this file)
├── package.json        # Root scripts & Turborepo config
├── pnpm-workspace.yaml # pnpm monorepo workspace definition
└── turbo.json          # Turbo build execution graph
```

---

## 📊 Core Data Domain & Mongoose Schemas

All Mongoose schemas in `apps/backend` and TypeScript interfaces in `apps/web` adhere to these entity definitions:

### 1. User (`users` collection)
- `_id`: ObjectId / string
- `name`: string
- `email`: string (unique)
- `passwordHash`: string
- `avatarUrl`: string?
- `createdAt`, `updatedAt`: Date

### 2. Workspace (`workspaces` collection)
- `_id`: ObjectId / string
- `name`: string
- `slug`: string (unique)
- `description`: string?
- `ownerId`: ObjectId -> User
- `members`: Array of `{ userId: ObjectId, role: 'ADMIN' | 'MEMBER' | 'VIEWER' }`
- `createdAt`, `updatedAt`: Date

### 3. Project (`projects` collection)
- `_id`: ObjectId / string
- `workspaceId`: ObjectId -> Workspace
- `name`: string
- `description`: string?
- `status`: `'ACTIVE' | 'ARCHIVED' | 'COMPLETED'`
- `createdAt`, `updatedAt`: Date

### 4. Task (`tasks` collection)
- `_id`: ObjectId / string
- `projectId`: ObjectId -> Project
- `workspaceId`: ObjectId -> Workspace
- `title`: string
- `description`: string?
- `status`: `'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'`
- `priority`: `'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'`
- `assigneeId`: ObjectId -> User?
- `creatorId`: ObjectId -> User
- `dueDate`: Date?
- `createdAt`, `updatedAt`: Date

### 5. AI Prompt Log & Action Audit (`ai_audit_logs` collection)
- `_id`: ObjectId / string
- `workspaceId`: ObjectId -> Workspace
- `userId`: ObjectId -> User
- `rawPrompt`: string
- `parsedIntent`: Object (Intent name, extracted entities & parameters)
- `actionsExecuted`: Array of `{ actionType: string, targetId: string, summary: string }`
- `status`: `'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'`
- `errorMessage`: string?
- `createdAt`: Date

---

## ⚡ AI Prompt-to-Action Engine Specification

The Prompt-to-Action engine translates user natural language into platform actions via Google Gemini structured tool calling.

### Action Execution Pipeline:
1. **Input**: User submits prompt in the Cmd+K Command Bar or AI Chat Drawer.
2. **Intent Parsing**: Gemini API parses natural language prompt into structured tool calls:
   - `createWorkspace`, `updateWorkspace`
   - `createProject`, `updateProject`, `deleteProject`
   - `createTask`, `updateTaskStatus`, `assignTask`, `updateTaskPriority`, `deleteTask`
   - `bulkCreateTasks`
3. **Validation & Authorization**: Validate that the acting user has permission for the target workspace/project.
4. **Transactional Database Mutation**: Perform MongoDB mutations via Mongoose.
5. **Real-time Broadcast & Audit**: Emit WebSocket event (`workspace:updated`) to all workspace listeners and save audit log.

---

## 🎨 Frontend & Backend Tech Stack Guidelines

### Frontend (`apps/web`):
- **Framework**: Next.js 16 (App Router), React 19, TypeScript.
- **Styling**: Tailwind CSS with custom theme & Lucide React icons.
- **State & Data Fetching**: TanStack Query / React Context + Axios/Fetch with JWT interceptors.
- **AI UI**: Cmd+K Command Bar modal, AI Chat Drawer, real-time activity stream via Socket.IO client.
- **Task View**: Drag-and-drop Kanban Board & List view.

### Backend (`apps/backend`):
- **Framework**: NestJS, TypeScript, RxJS.
- **Database**: MongoDB Atlas using `@nestjs/mongoose` and `mongoose`.
- **Authentication**: `@nestjs/jwt`, `passport-jwt`, `bcrypt`.
- **AI Integration**: `@google/genai` (Google Gemini SDK) for intent extraction.
- **WebSockets**: `@nestjs/websockets` & `@nestjs/platform-socket.io`.
- **Validation**: `class-validator` and `class-transformer` for DTOs.

---

## ⚙️ Development Workflows & Agent Guidelines

When modifying this repository, AI agents must follow these rules:

1. **Monorepo Commands**:
   - Run dev mode: `pnpm dev` (Runs backend on `:4000`, web on `:3000`)
   - Build project: `pnpm build`
   - Type-check: `pnpm check-types`
   - Linting: `pnpm lint`
2. **Module Boundaries**:
   - Keep shared components in `packages/ui`.
   - Maintain clear NestJS feature modules (`AuthModule`, `UsersModule`, `WorkspacesModule`, `ProjectsModule`, `TasksModule`, `AiModule`, `WebsocketsModule`).
3. **Verification**:
   - Always run `pnpm check-types` and relevant unit/integration tests before finalizing changes.
