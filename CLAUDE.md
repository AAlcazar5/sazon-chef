# Sazon Chef - Project Guide

## Project Overview
Sazon Chef is a full-stack AI-powered recipe recommendation app.
- **Frontend**: React Native / Expo (Expo Router, NativeWind/Tailwind)
- **Backend**: Node.js / Express / TypeScript
- **Database**: SQLite with Prisma ORM

## Tech Stack & Commands
### Backend (`/backend`)
- **Runtime**: Node.js 18+
- **Database**: Prisma with SQLite
- **Commands**:
  - Dev: `npm run dev`
  - Test: `npm test`
  - DB Migrate: `npx prisma migrate dev`
  - Seed AI: `npm run seed:ai`

### Frontend (`/frontend`)
- **Framework**: Expo Router
- **Styling**: Tailwind (NativeWind)
- **Icons**: Ionicons (via centralized `/frontend/components/ui/Icon.tsx`)
- **Commands**:
  - Dev: `npm start`
  - Test: `npm test`

## Key Context
- **Mascot**: "Sazon" (Habanero pepper chef). Use `AnimatedSazon` and `SazonMascot` components for UI states.
- **Scoring Logic**: Located in `backend/src/utils/`. Includes Behavioral, Temporal, Health Goal, and Superfood boosts.
- **Multi-AI Provider**: Orchestrated in `backend/src/services/aiProviders/`. Supports Claude, OpenAI, and Gemini.

## Coding Standards
- Use **TypeScript** for both ends.
- Follow the **Mascot Branding**: Use Sazon expressions contextually (e.g., `thinking` for loading, `chef-kiss` for success).
- **Haptics**: Always use `HapticTouchableOpacity` for interactive elements.
- **Naming**: Use camelCase for variables/functions, PascalCase for Components.
- **Roadmap**: There's a complete roadmap in the root folder called ROADMAP.md that outlines our progress through the app, and has next steps that we break down into smaller todo lists. We then mark tasks as complete as we go through them.
- **Testing**: Ensure to thoroughly test and add edge cases for each feature.
- **Cross Platform**: Ensure that all code works on both iOS and Android, run test cases for both.