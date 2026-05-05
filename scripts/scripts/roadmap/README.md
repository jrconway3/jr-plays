# Roadmap Automation Submodule

This folder is designed to work as a standalone git submodule that syncs roadmap issues into a GitHub Project.

## Requirements

- Node.js 20+
- GitHub personal access token with:
  - `repo` scope (issues and milestones)
  - `project` scope (project item access)

## Local Setup

1. Create local env file:

```bash
cp .env.example .env
```

2. Create local roadmap data files:

```bash
cp data/sprints.example.json data/sprints.json
cp data/tasks.example.json data/tasks.json
```

3. Update `.env`:

- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_PROJECT_NUMBER`

The example JSON files contain DUMMY placeholder data. Replace them with your actual roadmap milestones and tasks in `data/sprints.json` and `data/tasks.json`.

## Run

From this folder:

```bash
npm run create
```

## What It Does

- Creates missing milestones from `data/sprints.json`
- Creates missing task issues from `data/tasks.json`
- Adds those issues to the configured personal GitHub Project
- Skips issues/milestones that already exist

## Files Not Committed

- `.env`
- `data/sprints.json`
- `data/tasks.json`

These are ignored by this folder's `.gitignore`.
