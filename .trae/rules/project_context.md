<!-- gerado por repo_architect.sh em 2026-04-25 17:46 -->
# Project Context

## Overview
The project is a web-based financial management application designed for personal finance tracking. It allows users to record expenses and income, set payment statuses, manage due dates, visualize financial data through interactive dashboards, and establish savings goals, all while ensuring a responsive design optimized for mobile devices.

## Architecture
The application employs a full-stack architecture with a React frontend and an Express backend. The tech stack includes TypeScript, Vite for the frontend build process, and MongoDB for data storage. Key design decisions include the use of component-based architecture in React, context APIs for state management, and a modular structure for scalability and maintainability.

## Structure
- **backend/**: Contains server-side code, including connection management and server setup.
- **frontend/**: Houses the client-side application, including components, hooks, contexts, and configuration files.
- **infra/**: Contains Docker configurations for both frontend and backend, facilitating containerization and deployment.
- **.github/**: Contains GitHub Actions workflows for CI/CD, issue templates, and Copilot instructions.
- **mongo_tmp/**: Temporary JSON files for MongoDB data seeding.
- **public/**: Static assets like favicon and manifest files.

## Entry Points
- **backend/server.js**: Starts the Express server.
- **frontend/src/main.tsx**: Entry point for the React application, rendering the main App component.

## Infrastructure & DevOps
The project utilizes Docker for containerization, with separate Dockerfiles for the frontend and backend. Docker Compose is used for orchestrating multi-container applications. CI/CD is managed through GitHub Actions, with workflows for building and pushing images, running AI-driven tasks, and handling pull requests.

## Dependencies
Critical dependencies include:
- **Express**: For building the backend server.
- **React**: For the frontend UI framework.
- **Mongoose**: For MongoDB object modeling.
- **Vite**: For fast frontend build and development.
These dependencies are essential for the core functionality and performance of the application.

## For AI Assistants
AI should adhere to the following conventions:
- Follow the component-based structure for any new UI elements.
- Use context APIs for state management where applicable.
- Maintain TypeScript types for all new code.
- Ensure that any new features align with existing functionality and design patterns.
- Follow the CI/CD workflow for testing and deployment processes.
