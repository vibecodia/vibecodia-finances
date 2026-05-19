<!-- gerado por repo_architect.sh em 2026-04-25 17:44 -->
# Project Context

## Overview
This project is a web application designed to facilitate task management and financial tracking. It provides users with tools for managing their tasks, finances, and personal goals through an interactive interface, leveraging modern web technologies to enhance user experience.

## Architecture
The application is built using TypeScript and React, with Vite as the build tool. It follows a component-based architecture, promoting reusability and separation of concerns. Key design decisions include the use of context for state management and custom hooks for encapsulating logic related to specific features, such as local storage and dark mode.

## Structure
- `config/`: Contains configuration files for TypeScript and Vite.
- `public/`: Houses static assets like the favicon and HTML template.
- `scripts/`: Includes utility scripts for building and managing the application.
- `src/`: The main source directory containing:
  - `components/`: Reusable UI components and feature-specific components.
  - `contexts/`: Context providers for managing global state.
  - `hooks/`: Custom hooks for encapsulating reusable logic.
  - `lib/`: Utility functions and helpers.
  - `types/`: Type definitions for TypeScript.
  - `App.tsx`: The main application component.
  - `main.tsx`: The entry point for rendering the application.

## Entry Points
- `src/main.tsx`: The main entry file that initializes the React application.
- `index.html`: The HTML template that serves as the base for the web application.

## Infrastructure & DevOps
The project does not explicitly mention containers or cloud infrastructure. However, it is likely set up for CI/CD through GitHub Actions or similar tools, as indicated by the presence of multiple PRs for features and chores. Infrastructure as Code (IaC) is not present in the provided context.

## Dependencies
Key dependencies include React for building the UI, TypeScript for type safety, and Vite for fast development and build processes. These dependencies are crucial for maintaining a modern, efficient development workflow and ensuring code quality.

## For AI Assistants
AI should adhere to the following conventions:
- Follow the component-based architecture and maintain separation of concerns.
- Use TypeScript types consistently across the application.
- Leverage context and hooks for state management and logic encapsulation.
- Ensure that any changes maintain the existing structure and adhere to the project's coding standards.
