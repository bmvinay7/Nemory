# Technology Stack

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC plugin for fast compilation
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context API + TanStack Query for server state
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation

## Backend & APIs
- **Serverless Functions**: Vercel serverless functions in `/api` directory
- **Database**: Firebase Firestore for user data and schedules
- **Authentication**: Firebase Auth (email/password + Google OAuth)
- **External APIs**: Notion API, Telegram Bot API, Google Gemini AI

## Infrastructure
- **Hosting**: Vercel (primary) with Firebase Hosting (alternative)
- **Scheduling**: Vercel Cron Jobs for automated tasks
- **Security**: CSP headers, CORS configuration, rate limiting

## Key Libraries
- `@notionhq/client` - Notion API integration
- `@google/generative-ai` - Google Gemini AI integration
- `firebase` - Authentication and Firestore database
- `react-firebase-hooks` - Firebase React integration
- `date-fns` - Date manipulation
- `zod` - Runtime type validation

## Development Commands

```bash
# Development
npm run dev                    # Start dev server
npm run dev:with-bot          # Start dev server + Telegram bot

# Building
npm run build                 # Production build
npm run build:dev             # Development build
npm run build:secure          # Build with security checks

# Testing & Validation
npm run test:comprehensive    # Run comprehensive tests
npm run test:features         # Feature-specific tests
npm run security:audit        # Security audit
npm run validate:production   # Production validation

# Firebase
npm run firebase:deploy       # Deploy to Firebase
npm run firebase:deploy:rules # Deploy Firestore rules only

# Telegram Bot
npm run bot                   # Start polling bot
npm run bot:webhook          # Start webhook server
```

## Environment Variables
- Firebase config (VITE_FIREBASE_*)
- Notion OAuth credentials
- Telegram bot token
- Google Gemini API key