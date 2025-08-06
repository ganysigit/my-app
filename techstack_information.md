# Project Tech Stack: Notion-Discord Sync Service

This document outlines the core technologies and libraries used in the `my-app` project, a full-stack Next.js application designed for two-way synchronization between Notion databases and Discord channels.

## Core Technologies

- **Framework**: Next.js 15 (Full-stack with App Router)
  - Provides server-side rendering, API routes, and a robust development environment.
- **UI Framework**: shadcn/ui
  - A collection of re-usable components built with Radix UI and Tailwind CSS.
- **Styling**: Tailwind CSS
  - A utility-first CSS framework for rapidly building custom designs.
- **Icons**: Lucide Icons
  - A collection of open-source icons.
- **Database**: SQLite
  - A lightweight, file-based SQL database, suitable for local development and smaller deployments.
- **ORM**: Drizzle ORM
  - A TypeScript ORM for SQL databases, used for type-safe database interactions and migrations.
- **APIs**: 
  - Notion API v1: For interacting with Notion databases.
  - Discord API v10: For managing Discord bots, messages, and interactions.
- **Charting**: Recharts
  - A composable charting library built with React, used for analytics visualization on the dashboard.
- **Form Management**: React Hook Form
  - For efficient and flexible form validation and management.
- **Schema Validation**: Zod
  - TypeScript-first schema declaration and validation library.

## Key Libraries and Dependencies

### Frontend/UI
- `@radix-ui/*`: Various Radix UI components (Avatar, Checkbox, Dialog, Dropdown Menu, Label, Popover, Select, Separator, Slot, Tabs, Toast, Toggle, Toggle Group, Tooltip) for accessible and customizable UI elements.
- `@tabler/icons-react`: Additional icon set.
- `@tanstack/react-table`: Powerful toolkit for building data tables.
- `cmdk`: A command palette component.
- `next-themes`: For managing light/dark themes.
- `sonner`: A toast library for notifications.
- `vaul`: A dialog component for React.

### Backend/Utilities
- `@notionhq/client`: Official Notion API client.
- `discord.js`: A powerful Node.js module for interacting with the Discord API.
- `discord-interactions`: For handling Discord slash commands and interactions.
- `drizzle-orm`: The ORM for database interactions.
- `uuid`: For generating unique identifiers.
- `bufferutil`, `utf-8-validate`, `zlib-sync`: Dependencies related to WebSocket communication, often used by `discord.js`.

### Development Tools
- `typescript`: The primary language for the project.
- `eslint`, `eslint-config-next`: For code linting and maintaining code quality.
- `tailwindcss`: PostCSS plugin for Tailwind CSS.
- `drizzle-kit`: CLI tool for Drizzle ORM migrations and schema generation.
- `@types/*`: TypeScript type definitions for various libraries.
- `better-sqlite3`: SQLite3 binding for Node.js, used by Drizzle ORM.
- `tw-animate-css`: For Tailwind CSS animations.

## Build and Deployment

- **Build Tool**: Next.js's built-in build system, leveraging Turbopack for faster development builds.
- **Webpack Configuration**: Custom webpack configuration in `next.config.ts` to handle Discord.js externalization for server-side and mocking `zlib-sync`.
- **Deployment Compatibility**: Designed to be compatible with Cloudflare Workers (with D1 for database) and traditional Node.js hosting platforms like Vercel, Netlify, Railway, and DigitalOcean App Platform.