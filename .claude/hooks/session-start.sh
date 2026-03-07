#!/bin/bash
set -euo pipefail

# Only run in remote environments (Claude Code on the web)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install humanizer skill from GitHub
SKILL_DIR="$HOME/.claude/skills/humanizer"

if [ -d "$SKILL_DIR/.git" ]; then
  git -C "$SKILL_DIR" pull --ff-only origin main 2>/dev/null || true
else
  mkdir -p "$HOME/.claude/skills"
  git clone https://github.com/blader/humanizer.git "$SKILL_DIR"
fi
