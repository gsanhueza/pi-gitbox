# pi-gitbox

A [Pi Coding Agent](https://pi.dev/) extension that automatically redirects gitignored files and directories into an isolated **gitbox** — a local impersonation layer that makes them accessible to the AI agent without exposing your secrets. (_"gitbox"_ is a portmanteau of _"git"_ + _"sandbox"_.)

> **⚠️ DISCLAIMER:** This extension uses best-effort impersonation of gitignored paths. It is **your responsibility** to verify that secrets are not exposed to the agent. If absolute isolation is required, consider using a local model, [bubblewrap](https://github.com/containers/bubblewrap), or a fully isolated environment.

## Security considerations

After enabling gitbox, verify that impersonations are working correctly:

1. **Check impersonated files** — Open `~/.pi/agent/gitbox/<project>/` and confirm that gitignored files contain a single space (or `{}` for `.json` files).
2. **Test with a local model** — Ask the agent to read a known-secret file. It should report the file as empty (or `{}` if JSON), confirming the impersonation is active.

## Features

- **Gitignored file impersonation** — gitignored files are automatically mirrored into a private gitbox directory
- **Directory impersonation** — gitignored directories can also be mirrored (opt-in)
- **Command & path interception** — bash commands and file operations (read, edit, write, find, grep, ls) are internally redirected to the impersonated paths
- **Directory access control** — restricts agent access to allowed directories by default; prompts for approval when accessing paths outside the allowed list
- **Configurable directory bypass** — optionally disable directory restrictions
- **Status bar indicators** — color-coded status showing whether the gitbox is enabled, available, not required, unavailable or bypassed
- **Auto cleanup** — optionally delete the gitbox when the session exits

> **Note on directory impersonation:** By default, only gitignored files are impersonated. Enabling `impersonateDirs` also mirrors directories into the gitbox. This is useful when you want the agent to operate on the project without disrupting your current folders — for example, a Node project with `node_modules/` ignored by git can be used from the working directory (when `impersonateDirs: false`), or can be recreated to be available in the gitbox instead (when `impersonateDirs: true`).

## Status Bar

The status bar displays `📦 Gitbox:` followed by the current status:

| Status       | Meaning                                         | Color              |
| ------------ | ----------------------------------------------- | ------------------ |
| Enabled      | Gitbox active — gitignored paths exist          | `#00ff88` (green)  |
| Available    | Gitbox created but no gitignored paths detected | `#ffaa00` (orange) |
| Not required | Current directory is not a git repository       | `#ff8800` (orange) |
| Unavailable  | `git` command not found                         | `#ff4444` (red)    |
| Bypassed     | Impersonation disabled by configuration         | `#44ddff` (cyan)   |

When `bypassPaths` is enabled, the status bar appends ` (unrestricted)` to indicate that directory access restrictions are disabled.

## Installation

This package is a Pi extension. Install it with

```bash
npm install pi-gitbox
```

or

```bash
pi install https://github.com/gsanhueza/pi-gitbox
```

## Configuration

You can customize Gitbox options via the interactive menu (`/gitbox`) for common settings, or by adding a `gitbox` section to your `~/.pi/agent/settings.json` for all options:

```json
{
  "gitbox": {
    "baseDir": "~/.pi/agent/gitbox",
    "statusBar": true,
    "deleteOnExit": false,
    "impersonateDirs": false,
    "bypassGitbox": false,
    "bypassPaths": false,
    "allowedPaths": []
  }
}
```

### Configuration Options

| Option            | Type     | Default              | Description                               |
| ----------------- | -------- | -------------------- | ----------------------------------------- |
| `baseDir`         | string   | `~/.pi/agent/gitbox` | Base directory where gitboxes are created |
| `statusBar`       | boolean  | `true`               | Show gitbox status in the status bar      |
| `deleteOnExit`    | boolean  | `false`              | Delete the gitbox when the session exits  |
| `impersonateDirs` | boolean  | `false`              | Also impersonate gitignored directories   |
| `bypassGitbox`    | boolean  | `false`              | Skip impersonation of gitignored paths    |
| `bypassPaths`     | boolean  | `false`              | Bypass path access restrictions entirely  |
| `allowedPaths`    | string[] | `[]`                 | Additional paths to allow access to       |

> **Note:** The interactive menu (`/gitbox`) only exposes boolean keys. The remaining options (`baseDir`, `allowedPaths`) must be configured directly in `settings.json`.

### Directory Access

By default, the extension allows access to:

- The current working directory (`process.cwd()`)
- The Pi agent directory (`~/.pi/agent/`)
- The Pi package directory (`<...>/@earendil-works/pi-coding-agent`)
- `/dev/null`

If the agent attempts to access a path outside these allowed directories, a confirmation dialog appears:

```
[pi-gitbox]: Allow "/some/path" to be accessed?
```

Options:

- **Allow** — Access the path for this session
- **Deny** — Block access
- **Bypass (session only)** — Add the path to allowed paths for this session
- **Bypass (saved globally)** — Add the path to allowed paths permanently

Set `bypassPaths: true` to skip this check entirely.

> **Note:** When Pi doesn't have access to a UI, access will be automatically blocked.

## Commands

| Command         | Description                                       |
| --------------- | ------------------------------------------------- |
| `/gitbox`       | Open settings menu — configure gitbox options     |
| `/gitbox paths` | Show impersonated paths (source → target mapping) |

## How It Works

1. **Session Start** — On `session_start`, the extension checks whether the current directory is a git repository with `git` available
2. **Gitignored Path Detection** — Uses git-specific commands to discover all gitignored files and directories
3. **Gitbox Creation** — If the directory is a git repository, creates a private directory at `~/.pi/agent/gitbox/<project-name>` and mirrors gitignored files into it (files get placeholder content (`{}` for `.json` and ` ` (empty space) for others)). With `impersonateDirs: true`, gitignored directories are also mirrored.
4. **Path Mapping** — Builds a mapper from original absolute paths to their impersonated counterparts
5. **Event Interception** — On every `tool_call` event:
   - **Bash commands** — Extracts paths from the command using `shell-quote`, checks directory restrictions, then rewrites paths to their impersonated versions
   - **Path-based tools** (read, edit, write, find, grep, ls) — Checks directory restrictions, then resolves the path to its impersonated equivalent
   - **Dynamic fallback** — If a path wasn't detected during initialization, the extension performs a real-time `git check-ignore` lookup and creates the impersonation on the fly
6. **Status Bar** — Updates the status bar with the current gitbox state (enabled, available, not required, or unavailable)
7. **Session Shutdown** — Optionally removes the gitbox directory if `deleteOnExit` is enabled

## Dependencies

| Peer dependency                   | Purpose             |
| --------------------------------- | ------------------- |
| `@earendil-works/pi-coding-agent` | Pi Coding Agent SDK |
| `@earendil-works/pi-tui`          | Pi TUI SDK          |

| Dependency    | Purpose             |
| ------------- | ------------------- |
| `shell-quote` | Parse bash commands |
