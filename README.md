# Plugin Diagnostics for DeepSeek Harness

[简体中文](README.zh-CN.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Security](SECURITY.md)

Optional **privacy-restricted JSONL diagnostics** for supported DSH plugins, useful for investigating startup, tool outcomes and scheduled workflows.

## Recorded data

- Supported plugin lifecycle events and allowlisted metadata such as status, duration and safe error codes.
- Schedule-change notifications (**not** task instructions or content).
- Bounded LCM performance counters such as summary counts, model calls, cache hits and stage timings.

**Never recorded:** user messages, prompts, model responses, tool arguments, HTTP bodies, credentials or arbitrary exception stacks. Other plugins can run without the diagnostics service.

## Install and inspect

```sh
dsh plugin --profile desktop add github:Kerberos255/dsh-plugin-diagnostics
```

Replace `desktop` with your profile and restart DSH after installation or updates. Supported plugins emit diagnostics when the service is present; **there is no separate dashboard**.

Log directory:

```text
DSH_HOME/plugin-diagnostics/logs/<plugin-name>/YYYY-MM-DD.N.jsonl
```

Each plugin is limited to two **1 MiB** files per day. Entries older than **14 days** are periodically removed. No events or an unwritable destination may mean no log file is created; normal tasks are not blocked.

## Notes

- Logs cannot reconstruct conversations or replace real host/platform tests. A historical failure count does not necessarily indicate a new failure.
- Even restricted metadata can reveal operational timing; review [SECURITY.md](SECURITY.md) before sharing logs.

Tests: `npm test`. License: [MIT](LICENSE).
