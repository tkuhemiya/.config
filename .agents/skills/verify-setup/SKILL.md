---
name: verify-setup
description: Write a project-local verify-<app> skill that launches the app and drives it the way a user does, in any language or platform, so agents can prove behavior instead of claiming it. Use for /verify-setup, "make a verify skill for this repo", or when a project has no scripted way to prove UI, CLI, or service behavior.
---

# Verify setup

Write `.claude/skills/verify-<app>/` in the repo. Its reader is an agent that has never seen the app and opens it mid-task.

## 1. Learn the repo, not the user

Answer these from the code. Ask the user only what you can't observe.

- **Surface.** What a user touches: web UI, CLI or TUI, desktop app, API, library. Pick the primary one and note the rest.
- **Run.** The repo's own dev command (package scripts, Makefile, README), plus ports, env vars, seed data, and auth.
- **Drive.** How an agent can interact with it. Existing harnesses first: Playwright specs, PTY helpers, HTTP endpoints, a debug port. Otherwise use a browser over CDP for web and Electron, tmux for CLIs and TUIs, and HTTP for services.
- **Observe.** What evidence exists: screenshots, terminal transcripts, response bodies, logs, exit codes, database state.
- **Isolate.** Whether two instances can run side by side (ports, data dirs, profiles). If not, the skill must refuse to drive a shared instance.

If the checkout doesn't build or start, fix that or report exactly why before writing anything.

## 2. Write the skill

`SKILL.md` gets frontmatter (`name: verify-<app>` and a description naming the app, the surface, and when to use it) and these sections, each filled from what step 1 found:

- **Launch.** The exact command, and how to tell the app is usable, not just that a process answers. It must start from an empty data dir, including migrations and seed data. Include teardown.
- **Doctor.** One read-only check that the instance is worth driving: process up, right build, port owned by this run, auth valid.
- **Drive.** Real commands and selectors from this repo. Prefer stable handles such as ARIA labels, data attributes, prompt strings, and routes over coordinates.
- **Evidence.** What to capture and where it goes. Exercise the real user path, not internal setters or test-only endpoints. Capture the action and the resulting state. Check side effects (files, rows, messages) as well as the screen. If you use a dry-run mode, observe what it actually skips.
- **Cleanup.** Kill only what this run started, never by process name. Cleanup removes instances and scratch state and keeps the evidence.
- **Helpers.** Every script the skill ships is executable, and the skill shows how to call it.

## 3. Seed the feature map

Create `features/README.md` as an index, plus one file for each of the top 3 to 5 user-facing features. Each file has four sections:

- **Sub-features.** One line each.
- **How to get there.** From the user's point of view.
- **Driving it.** Preconditions, then numbered actions with the harness command and the observable result of each.
- **Gotchas.** If seed data lacks a precondition, the journey fails and the reason goes here. Never weaken a journey to make it pass.

## 4. Prove it before handing it over

Follow the new skill end to end once: launch, doctor, drive one mapped feature, capture evidence, clean up. Then confirm the evidence still exists. Fix whatever fails, and run cleanup after every failed attempt. A verify skill that was never run is a draft.

**Reply:** the skill path, the feature driven, the evidence path, and anything left unverified.
