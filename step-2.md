# Step 2 Specification: Workspaces, Dual-Sidebar Navigation, Group Messaging, Email Invites & AI Prompt Automation

## 📋 Overview

Step 2 expands the **AI Code-Space** platform by implementing core workspace capabilities, multi-tiered sidebar navigation, real-time workspace group messaging, team email invitation workflows via Zoho SMTP, and natural language AI automation for workspace setup and team member onboarding.

---

## 🎨 Theme & UI/UX Design System Guidelines

All frontend interfaces for Step 2 strictly follow the design tokens defined in `apps/web/app/globals.css`.

### Design System Principles:
- **Clean & Minimalist Aesthetic**: High-contrast typography (`Plus Jakarta Sans`), subtle rounded corners (`--radius: 1.4rem`), soft OkLCH color palette, and minimal border clutter.
- **Dark & Light Mode Native**: Dynamic fallback using CSS variables (`--background`, `--foreground`, `--sidebar`, `--sidebar-border`, `--primary`, `--accent`).
- **Sidebar Tokens**:
  - Main Sidebar Background: `var(--sidebar)`
  - Sidebar Hover / Active State: `var(--sidebar-accent)` and `var(--sidebar-accent-foreground)`
  - Borders: `var(--sidebar-border)`
- **Responsive Layout**: Fixed primary navigation bar with flexible secondary sidebar drawer and auto-expanding main chat canvas.

---

## 📐 Architecture & Key Design Decisions (Grill-Me Alignment)

1. **Default Conversation Group**: Every new workspace automatically generates a default `#general` conversation group upon creation so team members can chat immediately.
2. **Email Invitation Service**: Backend integrates Nodemailer configured with **Zoho SMTP** for sending transactional email invites.
3. **Invite Token Authentication Flow**: Invited users clicking an email link (`/invite/accept?token=...`) who are not logged in are redirected to Signup/Login with the token preserved. Upon account creation or login, they are automatically joined to the workspace and redirected to `/w/[workspaceSlug]`.
4. **Slug-Based Routing Structure**:
   - Workspace Main Dashboard: `/w/[workspaceSlug]`
   - Conversation Group Chat: `/w/[workspaceSlug]/[groupSlug]`
5. **AI Prompt Execution**: Natural language commands execute transactionally immediately, updating client UI state and rendering a toast notification summary.
6. **Primary Sidebar Workspace Overflow**: Initial view shows a maximum of **3 workspaces**. Clicking `+ N More` expands the primary sidebar list inline vertically to reveal all workspaces, with a `Show Less` toggle at the bottom.

---

## 🚀 Step 2 Feature Specifications

### 1. Workspace Core & Primary Sidebar Navigation
- **Workspace Display Limit**: Primary sidebar displays up to 3 workspaces by default.
- **Inline Workspace List Expansion**:
  - If a user belongs to > 3 workspaces, a `+ [N] More` button appears below the top 3 items.
  - Clicking `More` expands the list vertically inline to reveal all user workspaces, switching to a `Show Less` button.
- **"Create Workspace" Action Button**:
  - Positioned below the workspace list in the primary sidebar.
  - Opens the **Create Workspace Modal**.
- **Create Workspace Modal**:
  - **Inputs**: `Workspace Name` (Required), `Workspace Description` (Optional).
  - **Actions**: `Cancel` and `Create Workspace` (Primary action with loading state).
- **Workspace Selection**:
  - Clicking a workspace navigates to `/w/[workspaceSlug]` and opens the **Secondary Sidebar**.

---

### 2. Contextual Secondary Sidebar
When a workspace is selected, a secondary contextual sidebar slides into view directly beside the main primary sidebar.

- **Header**: Active Workspace Name & Avatar badge with quick access workspace switcher.
- **Conversation / Messaging Groups Section**:
  - Lists workspace conversation channels (e.g., `#general`, `#announcements`, `#dev-team`).
  - Automatically includes default `#general` channel.
  - `+ Create Group` button to add custom channels.
  - Selecting a group navigates to `/w/[workspaceSlug]/[groupSlug]` and opens chat in the main panel.
- **Invite User Button & Flow**:
  - Opens **Invite Team Member Modal**.
  - **Input**: Email ID (`email` validation).
  - **Action**: Dispatches invitation email via Zoho SMTP containing a secure JWT/token.
  - **Acceptance Flow**: Invited user accepts link, joins workspace as `MEMBER`.
- **Workspace Settings Button**:
  - Opens **Workspace Settings Panel/Modal**: Edit Name/Description, Manage Members/Roles (`ADMIN`, `MEMBER`, `VIEWER`), Delete Workspace (Admin-only).

---

### 3. Workspace Real-Time Group Chat & Messaging Bar
- **Main Chat Panel**:
  - Dynamic route `/w/[workspaceSlug]/[groupSlug]`.
  - Header displaying active channel name, description, and member count.
  - Socket.IO gateway connection (`workspace:message`) for instant multi-user message rendering without page reloads.
- **Message Bar / Input Field**:
  - Fixed sticky bottom message container styled with `--input`, `--radius-lg`, and `--shadow-sm`.
  - Multiline input (`Shift + Enter` for new lines, `Enter` to submit).

---

### 4. Prompt-to-Action AI Engine (Step 2 Integration)
Users can perform workspace creation and team member invitations using natural language prompts via the Cmd+K Command Bar or AI Chat Drawer.

- **Supported AI Commands**:
  1. **Prompt-to-Workspace**:
     - *Example*: *"Create a workspace named Mobile Launch with description Next-gen iOS and Android app"*
     - *Result*: AI invokes `createWorkspace` tool, creates workspace + default `#general` group, and updates UI state.
  2. **Prompt-to-Invite**:
     - *Example*: *"Invite alex@company.com and dev-lead@company.com to the current workspace"*
     - *Result*: AI invokes `sendWorkspaceInvite` tool, generates tokens, and dispatches Zoho emails.
  3. **Combined Prompt-to-Action**:
     - *Example*: *"Create a workspace called Backend Squad and send an invite to lead@nest.js"*
     - *Result*: AI creates workspace and dispatches invitation email transactionally.

---

## 🛠️ Architecture & Database Schemas

### Mongoose Schemas (`apps/backend`)

#### 1. `Workspace` Schema
```typescript
{
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: false },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['ADMIN', 'MEMBER', 'VIEWER'], default: 'MEMBER' },
    joinedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}
```

#### 2. `WorkspaceInvite` Schema
```typescript
{
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  email: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['ADMIN', 'MEMBER', 'VIEWER'], default: 'MEMBER' },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'EXPIRED'], default: 'PENDING' },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
}
```

#### 3. `ConversationGroup` Schema
```typescript
{
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}
```

#### 4. `Message` Schema
```typescript
{
  conversationId: { type: Schema.Types.ObjectId, ref: 'ConversationGroup', required: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  attachments: [{ url: String, fileName: String }],
  createdAt: { type: Date, default: Date.now }
}
```

---

## 📡 API Endpoints

### Backend REST Controllers (`apps/backend`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/workspaces` | Create new workspace & default `#general` group |
| `GET` | `/api/workspaces` | Get user workspaces (used for main sidebar) |
| `PATCH` | `/api/workspaces/:id` | Update workspace settings |
| `DELETE` | `/api/workspaces/:id` | Delete workspace |
| `POST` | `/api/workspaces/:id/invites` | Send Zoho email invitation to team member |
| `POST` | `/api/workspaces/invites/accept` | Accept email invite via token |
| `GET` | `/api/workspaces/:id/groups` | Fetch conversation groups for secondary sidebar |
| `POST` | `/api/workspaces/:id/groups` | Create a new conversation group |
| `GET` | `/api/groups/:groupId/messages` | Fetch message history for a group |
| `POST` | `/api/groups/:groupId/messages` | Send message (rest fallback) |

---

## 📝 Implementation Roadmap & Task Checklist

- [x] **Phase 1: Backend Foundation & Schemas**
  - Implement `WorkspaceInvite`, `ConversationGroup`, and `Message` Mongoose models.
  - Setup NestJS Mailer module with Zoho SMTP configuration (`ZOHO_SMTP_HOST`, `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`).
  - Implement workspace CRUD and invite token generation/verification controllers.

- [x] **Phase 2: Primary Sidebar & Workspace Modal**
  - Build `<PrimarySidebar />` component rendering top 3 workspaces.
  - Build vertical inline expansion logic (`Show More` / `Show Less`) for `> 3` workspaces.
  - Build `<CreateWorkspaceModal />` with validation and dark/light mode theme compliance.

- [x] **Phase 3: Secondary Sidebar & Navigation**
  - Setup Next.js `/w/[workspaceSlug]` and `/w/[workspaceSlug]/[groupSlug]` routes.
  - Build `<SecondarySidebar />` sliding drawer layout.
  - Implement Conversation Groups list & creation view.
  - Implement Workspace Settings modal (Edit/Delete).
  - Implement `<InviteMemberModal />` connected to `/api/workspaces/:id/invites`.

- [x] **Phase 4: Real-Time Group Chat UI**
  - Build `<ChatCanvas />` and `<MessageItem />` components.
  - Implement `<MessageBar />` sticky input box.
  - Wire Socket.IO client event listeners (`workspace:message`) for instant messaging updates.

- [x] **Phase 5: Gemini AI Tool Integration**
  - Define `createWorkspace` and `sendWorkspaceInvite` function calling definitions in `AiModule`.
  - Connect command bar input to Gemini structured tool calling execution loop.
  - Persist AI operations to `AIAuditLog` collection.

- [x] **Phase 6: End-to-End Verification & Design Polish**
  - Verify compliance with theme tokens in `globals.css`.
  - Perform dark/light mode UI tests and real-time socket verification.
