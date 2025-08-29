# Project Structure

## Root Directory
- **Configuration Files**: `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- **Deployment**: `vercel.json`, `firebase.json` for hosting configuration
- **Documentation**: Multiple `.md` files for setup guides and deployment checklists

## Source Code (`/src`)

### Components (`/src/components`)
- **Feature-based organization** with dedicated folders:
  - `auth/` - Authentication components (Login, Signup, ProtectedRoute)
  - `notion/` - Notion integration components
  - `telegram/` - Telegram bot configuration
  - `schedule/` - Scheduling management UI
  - `ai/` - AI summarization interface
  - `ui/` - Reusable shadcn/ui components

### Contexts (`/src/contexts`)
- React Context providers for global state management
- `AuthContext.tsx` - User authentication state
- `NotionContext.tsx` - Notion integration state
- `MetricsContext.tsx` - Dashboard metrics

### Library (`/src/lib`)
- **Business logic and utilities**:
  - `firebase.ts` - Firebase configuration and utilities
  - `notion.ts` - Notion API integration
  - `telegram-client.ts` - Telegram bot client
  - `schedule-*.ts` - Scheduling system components
  - `ai-summarization.ts` - AI processing logic

### Pages (`/src/pages`)
- Route components for React Router
- `Index.tsx` - Landing page
- `NotionCallback.tsx` - OAuth callback handler

## API Layer (`/api`)
- **Serverless functions** for backend operations
- Notion API proxies to handle CORS and authentication
- Cron job handlers for scheduled tasks
- Rate limiting and security middleware

## Architecture Patterns

### Component Organization
- **Feature-first structure** - group related components together
- **Separation of concerns** - UI components separate from business logic
- **Reusable UI components** in `/ui` folder following shadcn/ui patterns

### State Management
- **Context API** for global application state
- **TanStack Query** for server state and caching
- **Local state** with useState for component-specific data

### Error Handling
- **Error boundaries** at multiple levels (global and context-specific)
- **Robust error handling** with user-friendly messages
- **Security-first approach** with input validation and sanitization

### File Naming Conventions
- **PascalCase** for React components (`Dashboard.tsx`)
- **kebab-case** for utility files (`ai-summarization.ts`)
- **Descriptive names** that indicate purpose and scope