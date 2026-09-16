# Step 3 Specification: Project Management, Member Drag-and-Drop, Project Stats Analytics, Dual-Sidebar Project Navigation & AI Automation

## 📋 Overview

Step 3 advances the **AI Code-Space** platform by introducing multi-project management inside workspaces, granular role-based permissions (Admin-only project creation and member management), intuitive Drag-and-Drop member assignment UX, project-level settings and lifecycle control, dual-sidebar project list tracking (top 3 display limits sorted by creation date), real-time project statistics and analytics, and complete **Prompt-to-Action AI Integration** for natural language project control.

---

## 🎨 Theme & UI/UX Design System Guidelines

All frontend components for Step 3 maintain strict visual and functional alignment with the design system established in `apps/web/app/globals.css`.

### Design System Principles:
- **Clean & Minimalist Aesthetic**: High contrast, crisp typography (`Plus Jakarta Sans`), standardized border radius (`--radius: 1.4rem`), soft OkLCH color palette, subtle borders (`var(--sidebar-border)`), and zero UI clutter.
- **Dark & Light Mode Native**: Seamless dynamic switching using CSS variables (`--background`, `--foreground`, `--card`, `--primary`, `--accent`, `--muted`).
- **Drag-and-Drop UX Elegance**: Smooth micro-interactions, ghost dragging states, active ring highlight indicators (`ring-2 ring-primary/40`), and dropzone target indicators using `dnd-kit`.
- **Sidebar Integration**: Minimal list rows with icon badges, active selection states, hover backdrops, and animated inline expand/collapse toggles (`+ N More` / `Show Less`).

---

## 📐 Architecture & Resolved Key Design Decisions

1. **Role-Based Access Control (RBAC) & Workspace-Wide Public Visibility**:
   - **Workspace Visibility**: All members of a workspace can view any project created within that workspace. Project member assignment specifies active team members responsible for project deliverables.
   - **Admin Privilege**: Creating projects, editing project metadata, managing/assigning project members, and deleting projects are strictly restricted to workspace members with the `ADMIN` role.
2. **Dual-Column Drag-and-Drop Member Assignment**:
   - Interactive project creation & member management modal features a dual-column layout:
     - **Left Column**: Available workspace members with quick search.
     - **Right Column**: Project team target dropzone.
   - Admins can drag member cards between columns using `dnd-kit` or click single-action `+ Add` / `× Remove` buttons.
3. **Creation-Date Sorted Dual-Sidebar Navigation**:
   - Projects in both primary and secondary sidebars are sorted dynamically by creation timestamp (`createdAt` descending).
   - **Primary Sidebar**: Displays **Top 3 Projects** across user workspaces. Clicking `+ [N] More` expands the list vertically inline to reveal remaining projects.
   - **Secondary Sidebar**: Displays **Top 3 Workspace Projects** directly beneath Conversation Groups. Includes a `+ [N] More` inline expansion button and `+ New Project` trigger for Workspace Admins.
4. **Embedded Top Stats Banner**:
   - A compact, high-density summary banner is positioned at the top of the main project view at `/w/[workspaceSlug]/p/[projectSlug]`, displaying basic real-time metrics:
     - **Total Tasks Count**
     - **Completion Progress Percentage** (`DONE` / Total)
     - **High/Urgent Priority Task Counter**
     - **Assigned Team Members Count**
5. **Project Settings & Lifecycle Management**:
   - Dedicated Project Settings tab/modal allowing Admins to edit project title, description, and status (`ACTIVE`, `ARCHIVED`, `COMPLETED`), adjust member assignments, or permanently delete the project with project-name confirmation safety checks.
6. **Prompt-to-Action AI Engine (Immediate Execution & Live Broadcast)**:
   - Google Gemini API (`@google/genai`) parses natural language prompts into structured tool calls (`createProject`, `updateProject`, `deleteProject`, `addProjectMembers`, `bulkCreateTasks`).
   - Executes mutations immediately in MongoDB, emits Socket.IO updates (`workspace:updated`, `project:updated`), logs activity to `ai_audit_logs`, and returns instant toast notifications with direct project links.

---

## 🚀 Step 3 Feature Specifications

### 1. Admin Project Creation & Member Drag-and-Drop UX

- **Trigger & Authorization Guard**:
  - `+ New Project` button in the Secondary Sidebar is visible to Workspace `ADMIN` users. Non-admin users see a disabled state or standard view.
  - Opens the **Create Project Modal**.
- **Create Project Modal Layout & Inputs**:
  - **Title**: Required string input field.
  - **Description**: Multiline text area for project scope and objectives.
  - **Interactive Drag-and-Drop Member Selector**:
    - Left Column (**Available Workspace Members**): Lists all members belonging to the current workspace with avatar, name, and workspace role.
    - Right Column (**Project Team Members**): Drop area for members added to the new project.
    - **Interaction**: Admins can drag member items between containers using `dnd-kit` with visual drop targets and active drop zone feedback.
    - **Fallback Accessibility**: Each member card includes an instant `+ Add` / `× Remove` button for keyboard and mobile accessibility.
- **Submit Action**:
  - Validates inputs, creates the project record, assigns selected members, logs activity, and redirects to `/w/[workspaceSlug]/p/[projectSlug]`.

---

### 2. Contextual Dual-Sidebar Project Navigation

#### A. Primary Sidebar (Global Recent Projects)
- **Section Heading**: `Recent Projects`.
- **Sorting**: Ordered by `createdAt` descending.
- **Display Limit**: Displays top **3 projects** across user workspaces.
- **Inline Expansion Toggle**:
  - If total recently opened projects > 3, a `+ [N] More` button renders below the top 3 list.
  - Clicking `More` expands the list vertically inline to reveal all recent projects.
  - Replaces `More` button with a `Show Less` button to collapse back to top 3.
- **Item UX**: Clicking a project item navigates to that workspace & project (`/w/[workspaceSlug]/p/[projectSlug]`).

#### B. Secondary Sidebar (Workspace Projects)
- **Section Heading**: `Workspace Projects`.
- **Header Action**: `+ New Project` button (Admin restricted).
- **Sorting**: Ordered by `createdAt` descending.
- **Display Limit**: Displays top **3 projects** within the selected workspace.
- **Inline Expansion Toggle**:
  - If total workspace projects > 3, a `+ [N] More` button renders below the top 3 items.
  - Clicking `More` expands the list vertically inline to display all projects in the workspace.
  - Toggles back to `Show Less` when expanded.
- **Item Badges**: Displays project status indicator dots (`ACTIVE` green, `COMPLETED` blue, `ARCHIVED` gray).

---

### 3. Project Detail Page & Embedded Top Stats Banner

- **Route Structure**: `/w/[workspaceSlug]/p/[projectSlug]`
- **Embedded Top Stats Banner**:
  - Compact counter grid showing:
    1. **Total Tasks**: Total task count in project.
    2. **Completion Rate**: `DONE` count / Total count percentage with progress indicator.
    3. **Urgent & High Priority**: Count of critical tasks needing attention.
    4. **Team Size**: Number of assigned project members.
- **Header & Navigation Tabs**:
  - Project Title, Description, Status Badge, and Member Avatars stack.
  - Tabs:
    1. **Tasks (Board / List View)**: Kanban columns (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) and task list view.
    2. **Members**: List of assigned project members with Admin member management actions.
    3. **Settings (Admin Only)**:
       - Edit Project Title and Description.
       - Project Status selector (`ACTIVE`, `COMPLETED`, `ARCHIVED`).
       - Red-bordered **Danger Zone** with `Delete Project` confirmation modal.

---

### 4. Prompt-to-Action AI Engine (Step 3 Integration)

Users can perform full end-to-end project management using natural language prompts via the Cmd+K Command Bar or AI Chat Drawer.

#### Supported Natural Language AI Operations:

1. **Prompt-to-Create-Project**:
   - *Example Prompt*: *"Create a project named Mobile Redesign with description New iOS interface and assign Alex and Sarah"*
   - *AI Tool Call*: `createProject({ name: 'Mobile Redesign', description: 'New iOS interface', memberEmails: ['alex@company.com', 'sarah@company.com'] })`
   - *Result*: Creates project, assigns workspace members by email/name lookup, broadcasts WebSocket update, and updates UI state.

2. **Prompt-to-Modify-Project**:
   - *Example Prompt*: *"Update project Mobile Redesign description to Target release Q4 and set status to COMPLETED"*
   - *AI Tool Call*: `updateProject({ projectId: '...', description: 'Target release Q4', status: 'COMPLETED' })`
   - *Result*: Modifies project record and updates dashboard stats.

3. **Prompt-to-Assign-Members**:
   - *Example Prompt*: *"Add John and David to the Mobile Redesign project"*
   - *AI Tool Call*: `addProjectMembers({ projectId: '...', memberIdentifiers: ['John', 'David'] })`
   - *Result*: Updates project team list and re-renders member avatar stack.

4. **Prompt-to-Delete-Project**:
   - *Example Prompt*: *"Delete project legacy-v1 from the current workspace"*
   - *AI Tool Call*: `deleteProject({ projectId: '...' })`
   - *Result*: Validates Admin role, removes project and associated task references, and logs audit record.

5. **Prompt-to-Manage-Project-Tasks**:
   - *Example Prompt*: *"Add 3 high priority tasks to Mobile Redesign project: Login UI, Auth Integration, and OAuth Testing"*
   - *AI Tool Call*: `bulkCreateTasks({ projectId: '...', tasks: [...] })`
   - *Result*: Generates tasks linked to project ID with specified priority and updates Kanban board.

---

## 🛠️ Architecture & Database Schemas

### Mongoose Schemas (`apps/backend`)

#### 1. `Project` Schema
```typescript
{
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String, required: false },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED', 'COMPLETED'], default: 'ACTIVE' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
// Unique compound index on [workspaceId, slug]
```

#### 2. `Task` Schema Linkage Update
```typescript
{
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'], default: 'TODO' },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 📡 API Endpoints

### Backend REST Controllers (`apps/backend`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/workspaces/:workspaceId/projects` | `ADMIN` | Create a new project & assign initial members |
| `GET` | `/api/workspaces/:workspaceId/projects` | `MEMBER` | Fetch all projects within a workspace (sorted by `createdAt` desc) |
| `GET` | `/api/projects/:projectId` | `MEMBER` | Fetch project details & member details |
| `PATCH` | `/api/projects/:projectId` | `ADMIN` | Update project title, description, or status |
| `POST` | `/api/projects/:projectId/members` | `ADMIN` | Add members to project (supports bulk drag-and-drop submit) |
| `DELETE` | `/api/projects/:projectId/members/:userId` | `ADMIN` | Remove member from project |
| `GET` | `/api/projects/:projectId/stats` | `MEMBER` | Fetch project top stats summary (total tasks, done %, high priority count) |
| `DELETE` | `/api/projects/:projectId` | `ADMIN` | Permanently delete project and remove references |

---

## 📝 Implementation Roadmap & Task Checklist

- [x] **Phase 1: Backend Foundation & Project Schemas**
  - Create `Project` Mongoose schema & DTOs with workspace relationship and index.
  - Update `Task` schema with mandatory `projectId` index.
  - Implement NestJS `ProjectsModule`, `ProjectsController`, and `ProjectsService` with Admin role guards.
  - Build stats aggregation pipeline endpoint (`GET /api/projects/:id/stats`).

- [x] **Phase 2: Drag-and-Drop Member Selection & Creation Modal**
  - Install and configure `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` in `apps/web`.
  - Implement `<CreateProjectModal />` featuring double-column drag-and-drop workspace member selection.
  - Include fallback button interactions for accessibility and full responsive support.

- [x] **Phase 3: Primary & Secondary Dual-Sidebar Updates**
  - Update `<PrimarySidebar />` to fetch global top 3 projects sorted by `createdAt` with `+ [N] More` inline accordion toggle.
  - Update `<SecondarySidebar />` to render workspace top 3 projects sorted by `createdAt` with inline expansion toggle.

- [x] **Phase 4: Project Detail Page, Embedded Top Stats & Settings Tab**
  - Implement Next.js route `/w/[workspaceSlug]/p/[projectSlug]`.
  - Build `<ProjectHeader />` with title, description, status badge, and member avatar stack.
  - Build `<TopStatsBanner />` rendering total tasks, completion percentage, high priority count, and team count.
  - Build `<ProjectSettingsTab />` with Admin-only edit form, member management drag-and-drop area, and project deletion modal with confirmation safeguard.

- [x] **Phase 5: Gemini AI Tool Calling Integration**
  - Implement `createProject`, `updateProject`, `deleteProject`, `addProjectMembers`, and `bulkCreateTasks` tools in NestJS `AiModule`.
  - Connect tools to Google Gemini SDK (`@google/genai`) function call handler.
  - Log all executed project actions to `ai_audit_logs` collection and emit real-time WebSocket updates (`project:updated`, `workspace:updated`).

- [x] **Phase 6: End-to-End Verification & Design Polish**
  - Verify complete dark/light mode compatibility with `globals.css` CSS variables.
  - Test Admin authorization guards for project creation, modification, and deletion.
  - Conduct thorough verification of drag-and-drop UX, sidebar top 3 limit expansion toggles, and natural language AI prompt execution.
