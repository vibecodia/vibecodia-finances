# Task — Issue #338

## What needs to be done
### 🎯 Descrição da Tarefa

Refactor the number input in the "Repetir Lançamento" section.
Remove: <Input type="number" ...> field entirely.
Replace with: Two buttons (minus and plus) with the current value displayed between them. Follow the existing UI patterns, component library, and design system already used in this project.
Rules:
file to look: frontend/src/components/TransactionForm.tsx
Minimum value: 1 (never goes below 1)
Maximum value: 60
Default value: 1
Minus button disabled when value is 1
Plus button disabled when value is 60
Keep disabled={isAnimating} on both buttons
Keep setRepeatMonths logic intact
Use icons consistent with the project (if lucide-react is already imported, use Plus and Minus from it)

Do not change anything outside the <div className="flex items-center gap-4"> block.

## Rules
- Follow existing code patterns, file structure and naming conventions
- Frontend is under frontend/ (React, TypeScript, Vite, Tailwind CSS)
- Backend is under backend/ (Node.js, Express, MongoDB/Mongoose)
- Do not modify unrelated files
- Do not change package.json, lock files or config files unless explicitly required
- Never modify authentication, environment configuration or database schema unless explicitly requested
- Implement only minimal and safe changes
- Do not refactor unrelated code
- Never create unused imports/vars - prefix unused params with _
- Verify with npx tsc --noEmit
