# skillctl

`skillctl` is the unified CLI for canonical skill validation, adapter generation, compatibility matrix generation, installation, sync, and environment checks.

## Commands

```bash
node tools/skillctl/src/cli.mjs validate
node tools/skillctl/src/cli.mjs build --tool all
node tools/skillctl/src/cli.mjs matrix
node tools/skillctl/src/cli.mjs install --tool claude --dest ~/.claude/skills
node tools/skillctl/src/cli.mjs sync --tool all --dest /tmp/skills
node tools/skillctl/src/cli.mjs doctor
```

Wrapper:

```bash
tools/skillctl/skillctl <command> [options]
```

## Default install destinations

- codex: `~/.codex/skills`
- claude: `~/.claude/skills`
- cursor: `~/.cursor/skills`
- copilot: `~/.config/skillctl/copilot-skills`
