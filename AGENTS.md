# Obsidian Spalls - Project Context

## Project Overview

Obsidian Spalls (forked form Obsidian Thino, also known as Obsidian Memos) is a high-performance, quick-capture plugin for Obsidian. It allows users to capture thoughts, tasks, and ideas into their Daily Notes with a streamlined UI inspired by flomo and memos.

### Core Architecture

- **Framework:** React 17 (Legacy version, but stable for this plugin), new components should use React 19+.
- **Styling:** Tailwind CSS (v4) is integrated via the Vite plugin (`@tailwindcss/vite`) and is the preferred method for new and simple styling. Complex styles should use less for deep customizing.
- **State Management:** Custom implementation in `src/labs/` and `src/stores/`.
- **Obsidian Integration:** Extends the `Plugin` class from `obsidian` and utilizes `obsidian-daily-notes-interface` for daily note management.
- **Build System:** Vite 3+ configured for library mode to output `main.js` and `styles.css` directly to the project root.
- **Toolchain**: 
  - **Building System**: `Vite`
  - **Project Management**: `bun` or `npm`
  - **Testing**: `vitest`
  - **Linting**: `ESLint`, will switch to `biome in the feature
  - **Formatter**: `Prettier`, will switch to `biome in the feature


## Key Files & Directories

- `src/index.ts`: The main entry point for the Obsidian plugin. Handles plugin lifecycle (`onload`, `onunload`), command registration, and view mounting.
- `src/App.tsx`: The root React component.
- `src/tailwind.css`: Entry point for Tailwind CSS directives.
- `src/memos.ts`: Contains the `Memos` class which extends `ItemView` to integrate React into the Obsidian workspace.
- `src/components/`: UI components (Memo editor, List view, Heatmap, etc.).
- `src/services/`: Business logic for memo creation, deletion, and filtering.
- `src/obComponents/`: Deprecated. Mixed with UI elements, service logic and obsidian API calls
- `manifest.json`: Plugin metadata for Obsidian.
- `src/data`: The data layer
- `vite.config.js`: Build configuration for development and production.

## Building and Running

The project uses `bun` or `npm` for task management.

- **Development:**
  ```bash
  bun run dev
  # Starts Vite in watch mode.
  ```
- **Production Build:**
  ```bash
  bun run build
  # Generates optimized main.js and styles.css.
  ```
- **Linting & Formatting:**
  ```bash
  bun run lint       # Run ESLint
  bun run lint:fix   # Fix linting issues
  bun run format     # Run Prettier and ESLint fix
  ```
- **Testing:**
  ```bash
  bun run test
  # watch mode
  bun run test:watch
  ```

## Development Conventions

- **TypeScript:** Strict typing is preferred.
- **Styling:** **Tailwind CSS is the preferred way for simple styles.** Complex styles use Less files for deep customizing.
- **Localization:** Use the translation helper in `src/translations/`.
- **Obsidian API:** Always use `this.app` within the plugin context to access Obsidian's internal state.
- **Components:** Functional components with Hooks are standard, though some legacy structures might exist.

## Key Concepts

- **Data Source:** Memos can be stored in different data sources. Such as Daily Notes, Single File, Multiple files, SQLite...
- **Parsing:** The plugin parses markdown files to extract memo items, supporting timestamps and task statuses.
- **Interoperability:** Designed to work alongside the "Daily Notes" or "Periodic Notes" core/community plugins.


