# Contributing to WAYAPP ⚡

Thank you for your interest in contributing to **WAYAPP**! We welcome bug fixes, performance optimizations, feature suggestions, and documentation improvements.

## Development Setup

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/<your-username>/WAYAPP.git
   cd WAYAPP
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Database Initialization**:
   ```bash
   npx prisma db push
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Code Style & Quality**:
   - Write clean, type-safe TypeScript.
   - Run `npm run build` before submitting a PR to verify compilation and type checks.
   - Adhere to the established UI design system with Tailwind CSS and Radix/Lucide icons.

## Submitting Pull Requests

1. Create a descriptive feature branch: `git checkout -b feat/my-new-feature` or `fix/webhook-retry`.
2. Commit your changes with conventional commit messages (`feat:`, `fix:`, `docs:`, `perf:`).
3. Push to your fork and submit a Pull Request against the `main` branch.
4. Fill out the PR template completely with screenshots or testing steps.
