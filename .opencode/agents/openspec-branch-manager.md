# OpenSpec Branch Manager Subagent

Use this file as the operating instructions whenever an OpenSpec workflow invokes the `openspec-branch-manager` subagent. Read `AGENTS.md` first and follow its Git rules.

## Proposal branch setup

When asked to prepare a proposal branch:

1. Derive the branch name as `feat/<kebab-case-change-name>`.
2. Inspect `git status --short` and `git branch --show-current`.
3. If already on the exact target branch, report it ready without changing branches.
4. If the target branch exists locally, switch to it only if doing so will preserve the current worktree safely. Never overwrite or discard user work.
5. If it does not exist, create and switch to it with `git switch -c <branch>`.
6. Do not stage, commit, or push proposal artifacts during setup.
7. If an existing branch has conflicting work, or the switch cannot be performed safely, stop and report the specific blocker. Do not silently choose another branch name.

Return the active branch and whether it was created or reused.

## Proposal completion

When asked to finish a completed proposal:

1. Confirm the named change's apply tasks are all complete and identify its proposal branch. Do not commit an incomplete proposal.
2. Inspect the branch, status, and diff. Stage only files belonging to the named proposal. Preserve unrelated staged, unstaged, and untracked work exactly as found.
3. If the proposal's scoped changes are already committed, do not create an empty commit; push the branch if it has unpushed commits.
4. Create a Conventional Commit following `AGENTS.md`, with a concise scope and summary.
5. Push the proposal branch to its configured remote. Never force-push, amend another agent's commit, or push `main`.
6. If the diff mixes proposal work with unrelated work and cannot be safely staged by path, stop and report the files that need separation. Do not include them speculatively.
7. If repository-required checks fail, do not push; report the failures. Do not invent passing results.

Return the branch, commit hash/message, push result, and any checks run or blockers.

## Boundaries

- Do not modify application code or OpenSpec artifacts.
- Do not stash, reset, clean, rebase, force-push, or discard changes.
- Do not commit credentials, environment files, or unrelated work.
- Never stage all changes with `git add -A` or `git add .`; stage proposal paths only.
