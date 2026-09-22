# Step 4 Specification: Task Management, Single-User Drag-and-Drop Assignment, Personal Task Views, Project Settings Task Administration & AI Automation

## 📋 Overview

Step 4 enhances the **AI Code-Space** platform by introducing complete **Task Management** capabilities within projects. This includes Admin-driven task creation with an intuitive **Single-User Drag-and-Drop Assignment UX**, a modern borderless **Task Table View** on the project page equipped with an **"All Tasks" / "Your Tasks"** toggle switch, priority filters, colored status & priority badges, **backend pagination (10 tasks/page)**, a **Task Detail Modal**, centralized **Task Administration in Project Settings**, and full **Prompt-to-Action AI Automation** for natural language task management.

---

## 🎨 Theme & UI/UX Design System Guidelines

All frontend components for Step 4 strictly adhere to the design principles and CSS tokens defined in `apps/web/app/globals.css`.

### Design System Principles:
- **Clean & Minimalist Aesthetic**: High-contrast, clean typography (`Plus Jakarta Sans`), standardized border radius (`--radius: 1.4rem`), soft OkLCH color palette, borderless modern table styling, and subtle borders (`var(--sidebar-border)`).
- **Dark & Light Mode Native**: Seamless dynamic switching using standard CSS variables (`--background`, `--foreground`, `--card`, `--primary`, `--accent`, `--muted`).
- **Drag-and-Drop Single-User Assignment**: Interactive `dnd-kit` dropzone configured to accept **exactly one assigned project user** per task with clear visual drag overlays, active dropzone highlights, and click fallback controls.
- **Modern Borderless Table View**: Positioned directly below the Project Tasks Overview with sticky header toggles, priority filter dropdown, colored badges, inline status dropdowns, and backend pagination controls.

---

## 📐 Architecture & Key Design Decisions (Grill-Me Aligned)

1. **Task Data Model & Field Mapping**:
   - **Task Topic** (`title`): Subject/title of the task.
   - **Task Message** (`description`): Detailed body/content describing the task.
   - **Task Priority**: Priority level (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) with color-coded badges.
   - **Assigned User** (`assigneeId`): Single user reference selected from project members.
   - **Task Status**: Status lifecycle indicator (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with color-coded badges and inline dropdown controls.
   - **Project & Workspace Linkage**: `projectId` and `workspaceId` indexing for fast scoping.

2. **Add Task Modal & Single-User Drag-and-Drop Assignment**:
   - Integrates a list of **Project Members** (users assigned to the project).
   - Admins can drag **a single project user** from the available team list into the `Assigned User` dropzone (replacing any previous selection).
   - Includes fallback single-click selection buttons (`+ Assign` / `× Remove`) for accessibility.
   - Includes dropdown selector for `Task Priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).

3. **Modern Borderless Task Table & View Toggle**:
   - Positioned directly below the **Project Tasks Overview** (Top Stats Banner) on `/w/[workspaceSlug]/p/[projectSlug]`.
   - **Toggle Switch**: Top bar toggle between **"All Tasks"** and **"Your Tasks"** (filters strictly by `assigneeId === currentUser._id`).
   - **Priority Filter Button**: Filter dropdown allowing users to filter by priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`, or `ALL`).
   - **Table Display**: Displays task titles as clickable links, assigned user avatar/name, priority badge, and inline task status dropdown.
   - **Backend Pagination**: Returns **10 tasks per page** with `page`, `limit`, and `total` pagination controls in the table footer.
   - **Task Detail Modal**: Clicking a task title opens a modal displaying full topic, message, priority, assignee, status controls, and Admin Edit/Delete actions.

4. **Project Status Management**:
   - Project page header provides controls to toggle overall **Project Status** (`ACTIVE` / Ongoing ➔ `COMPLETED` / `ARCHIVED`) aligned with backend models.

5. **Project Settings Task Administration (Admin Only)**:
   - Dedicated **Task Administration** section inside **Project Settings** listing all project tasks.
   - Admins can search/filter tasks and perform **Edit** (opens Edit Task Modal) and **Delete** (with confirmation safeguard).

6. **Prompt-to-Action AI Engine (Step 4 Task Operations)**:
   - Extends Google Gemini API (`@google/genai`) function calling for task management:
     - `createTask`: Create task with topic, message, priority, and assignee lookup.
     - `updateTask`: Update task topic, message, priority, status, or assignee.
     - `deleteTask`: Delete task by title/ID.
   - Enforces Admin privilege verification, emits Socket.IO updates (`task:created`, `task:updated`, `task:deleted`), and logs to `ai_audit_logs`.

---

## 🚀 Step 4 Feature Specifications

### 1. Add Task Modal with Drag-and-Drop Single-User Assignment

- **Trigger**: "Add Task" / "New Task" button on Project Detail page (accessible to Admins).
- **Modal Components**:
  - **Task Topic (`title`)**: Text input field.
  - **Task Message (`description`)**: Multiline textarea field.
  - **Priority Selector**: Dropdown menu (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - **Drag-and-Drop Single-User Assignee Selector**:
    - Available project member cards displaying avatar and name.
    - Single-user target dropzone (`dnd-kit`). Dragging a member sets them as `assigneeId` (replaces previous choice).
    - `+ Select` and `× Clear` button fallbacks.
- **Submit Action**: Saves task record with `projectId`, `workspaceId`, `creatorId`, `assigneeId`, `priority`, and default `status: TODO`.

---

### 2. Borderless Modern Task Table & View Toggle ("All Tasks" / "Your Tasks")

- **Position**: Placed directly below the Project Top Stats Banner on `/w/[workspaceSlug]/p/[projectSlug]`.
- **Top Bar Toolbar**:
  - **Toggle Switch**: `[ All Tasks | Your Tasks ]`. When "Your Tasks" is active, filters strictly by `assigneeId === currentUser._id`.
  - **Priority Filter Dropdown**: Filter by `ALL`, `LOW`, `MEDIUM`, `HIGH`, or `URGENT`.
- **Borderless Modern Table Layout**:
  - **Columns**: `Task Title` | `Assignee` | `Priority` | `Status` | `Created`
  - **Task Title Link**: Clicking the task title opens the **Task Detail Modal**.
  - **Priority Badges**: Color-coded badges (`LOW`: gray/blue, `MEDIUM`: green/emerald, `HIGH`: amber/orange, `URGENT`: red/rose).
  - **Inline Status Dropdown**: Direct status transition selector (`TODO` ➔ `IN_PROGRESS` ➔ `IN_REVIEW` ➔ `DONE`) updating DB & Top Stats immediately.
- **Backend Pagination Controls**:
  - Table footer displaying page numbers, `Previous` / `Next` buttons, and task count summary (`Showing 1-10 of 24 tasks`).

---

### 3. Task Detail Modal

- **Trigger**: Clicking any task title in the task table or AI action toast.
- **Content**:
  - Full Task Topic & Detailed Message Content.
  - Priority badge & Assignee user details.
  - Status selector (allows assigned user or Admin to change status).
  - Admin Action Buttons: **Edit Task** (opens Edit Task Modal) and **Delete Task** (confirmation dialog).

---

### 4. Project Status Lifecycle Control

- Toggle control in Project Header allowing Admins to change Project status (Ongoing `ACTIVE` ➔ `COMPLETED`).

---

### 5. Task Administration in Project Settings (Admin Only)

- Located under the **Settings** tab on `/w/[workspaceSlug]/p/[projectSlug]`.
- **Admin Task Administration Table**:
  - Searchable list of all project tasks.
  - **Edit Button**: Opens Edit Task Modal (modify topic, message, priority, assignee, status).
  - **Delete Button**: Opens red-bordered confirmation dialog to permanently delete task.

---

### 6. Prompt-to-Action AI Automation for Tasks

Users can interact with the Cmd+K Command Bar or AI Chat Drawer using natural language prompts.

#### AI Commands & Executions:
1. **Prompt-to-Create-Task**:
   - *Example*: *"Create an urgent task 'OAuth Integration' with description 'Implement JWT flow' assigned to Alex"*
   - *Result*: Resolves user "Alex", verifies Admin role, calls `createTask`, emits Socket.IO update, updates UI state.
2. **Prompt-to-Edit-Task**:
   - *Example*: *"Set status of task 'OAuth Integration' to DONE"*
   - *Result*: Calls `updateTask`, updates status, and recalculates project stats.
3. **Prompt-to-Delete-Task**:
   - *Example*: *"Delete task 'OAuth Integration' from current project"*
   - *Result*: Validates Admin role, removes task record, and updates table view.

---

## 🛠️ Architecture & Database Schemas

### Task Mongoose Schema (`apps/backend/src/schemas/task.schema.ts`)

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string; // Task Topic

  @Prop({ required: false, trim: true })
  description?: string; // Task Message

  @Prop({ required: true, enum: TaskStatus, default: TaskStatus.TODO })
  status: string; // Task Status

  @Prop({ required: true, enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: string; // Task Priority

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  assigneeId?: Types.ObjectId; // Assigned User (Single assignment)

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @Prop({ type: Date, required: false })
  dueDate?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
```

---

## 📡 API Endpoints

### Backend REST Controllers (`apps/backend`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/projects/:projectId/tasks` | `ADMIN` | Create a new task with topic, message, priority, and single assignee |
| `GET` | `/api/projects/:projectId/tasks` | `MEMBER` | Fetch paginated project tasks (Supports `?page=1&limit=10&myTasks=true&priority=HIGH`) |
| `GET` | `/api/tasks/:taskId` | `MEMBER` | Fetch single task details for Task Detail Modal |
| `PATCH` | `/api/tasks/:taskId/status` | `MEMBER` | Update task status (assigned user or Admin) |
| `PATCH` | `/api/tasks/:taskId` | `ADMIN` | Update task details (topic, message, priority, assignee, status) |
| `DELETE` | `/api/tasks/:taskId` | `ADMIN` | Permanently delete a task |

---

## 📝 Implementation Roadmap & Task Checklist

- [x] **Phase 1: Backend API & Service Enhancement**
  - Implement task CRUD endpoints in `TasksModule` with Admin authorization guards.
  - Implement backend pagination (`10 tasks/page`) with `myTasks` and `priority` query parameters.

- [x] **Phase 2: Add Task Modal with Single-User Drag-and-Drop UX**
  - Integrate project member list into existing Add Task modal.
  - Setup `dnd-kit` dropzone restricted to single user assignment with click fallbacks.
  - Add priority selection menu (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).

- [x] **Phase 3: Borderless Task Table & View Toggle ("All Tasks" / "Your Tasks")**
  - Build `<TaskTableToolbar />` with `[ All Tasks | Your Tasks ]` toggle and Priority Filter.
  - Build `<BorderlessTaskTable />` with colored badges, inline status dropdown, and pagination.
  - Build `<TaskDetailModal />` triggered when clicking task title.

- [x] **Phase 4: Task Administration in Project Settings**
  - Add **Task Administration** table in Project Settings for Admins.
  - Build edit task modal and task deletion confirmation dialogs.

- [x] **Phase 5: Gemini AI Prompt-to-Action Integration**
  - Define `createTask`, `updateTask`, and `deleteTask` tools in `AiModule`.
  - Connect tools to Gemini structured calling, Socket.IO broadcast, and `ai_audit_logs`.

- [x] **Phase 6: Verification & Final Polish**
  - Verify strict theme token compliance with `globals.css`.
  - Test single-user drag-and-drop assignment, pagination, and user-scoped task filtering.
