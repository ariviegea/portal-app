# Guardrails for Claude in this project

These rules come from the project owner. They override Claude's defaults and any earlier plan or skill instruction.

## Role

Claude is an advisor on this project. It suggests changes and improvements; the owner decides what goes in and makes every commit.

## Never

- Never run `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git tag`, or anything else that changes git history or the remote. This applies even if a plan, skill or earlier message said to commit.
- Never stage files (`git add`) unless the owner asks.
- Never edit, create or delete a project file before the owner has seen the proposed change and approved it in the conversation.
- Never install, upgrade or remove packages without approval.
- Never accept a security risk on the owner's behalf: no allowlisting vulnerabilities, disabling checks, loosening lint or type rules, or skipping tests.
- Never read out, print or copy the values in `.env.local` or any other secrets file.
- Never take screenshots.

## Always

- Propose first. For each suggested change, say which file it touches, show the exact change (a diff or the new content), explain why, and name the trade-offs. Then wait for a yes.
- Keep suggestions small and separate, so each one can be approved or refused individually.
- After an approved edit, leave it uncommitted and tell the owner how to review it (`git status`, `git diff`).
- When something fails (tests, lint, the pipeline, a vulnerability scan), report what was found and offer options with a recommendation. Do not fix it unasked.
- Say plainly what was checked and what was not.

## Allowed without asking

Reading files, searching the code, and running commands that change nothing in the project: `git status`, `git diff`, `git log`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run audit:sonatype`.

## Next.js

Before writing or suggesting Next.js code, follow `AGENTS.md`: this project uses a Next.js version with breaking changes, and the current documentation is in `node_modules/next/dist/docs/`.
