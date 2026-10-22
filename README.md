# Plugin Diagnostics for DeepSeek Harness

[简体中文](README.zh-CN.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Security](SECURITY.md)

An **optional, privacy-restricted JSONL diagnostics service** for DSH plugins. It helps troubleshoot plugin startup, supported tool outcomes, scheduled-job changes and bounded failure metadata without collecting conversation text or credentials.

## What it records

- Lifecycle events for supported plugins, including startup and stop.
- Allowlisted event names and metadata such as status, duration, safe error codes and recognized plugin tool names.
- Errors that supported plugins explicitly report through `pluginDiagnostics.record(...)`.
- A schedule-change notification, but **not** the schedule contents or task instructions.

It does **not** log user messages, submitted answers, prompts, model responses, tool arguments, HTTP bodies, tokens, secret values, arbitrary stack traces or user identities. Plugins that do not emit diagnostics remain functional.

## Installation and logs

Requires a compatible DSH host with the peer services declared in [package.json](package.json). Install into the profile that hosts your plugins (for example, `desktop`):

```sh
dsh plugin --profile desktop add github:Kerberos255/dsh-plugin-diagnostics
```

Restart the host after changing plugin code. Other supported plugins detect the `pluginDiagnostics` service when present; there is **no separate dashboard or mandatory settings page**.

Log directory: `DSH_HOME/plugin-diagnostics/logs/<plugin-name>/YYYY-MM-DD.N.jsonl`. Files are limited to **two 1 MiB parts per plugin per day**; entries older than **14 days** are periodically removed. Full or unwritable log destinations silently drop diagnostic entries instead of blocking user tasks.

## Troubleshooting and limitations

Check whether the plugin and its dependencies loaded before expecting new logs. A previous-failures count is historical, **not** evidence that every count was a new error. Diagnostics are deliberately sparse; they cannot reconstruct a session, explain arbitrary model behavior, or replace live host/platform tests.

Review [SECURITY.md](SECURITY.md) before sharing logs; even allowlisted metadata may reveal operational timing. Run `npm test` for portable logger tests. Packaging can be checked with `npm pack --dry-run`; compatibility with a real DSH host must be tested separately.

MIT licensed. See [LICENSE](LICENSE).

## LCM performance counters (0.1.7)

For `dsh-lossless-context` only, the diagnostic allowlist includes bounded numeric stage timings, leaf and merged-summary counts, model-call totals, cache hits, and concurrency. It does not record the model output, original conversation, prompts or credentials.
