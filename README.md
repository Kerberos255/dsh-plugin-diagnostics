# DSH Plugin Diagnostics

Optional privacy-restricted diagnostics for DeepSeek Harness plugins. Records JSONL lifecycle, tool outcomes and bounded error metadata for supported DSH plugins. It never includes chat transcripts, submitted answers, HTTP payloads, user identity, credentials, or arbitrary stack traces.

## Operation

Add this bundle to the DSH host plugin list. Other plugins may opt in via the pluginDiagnostics service. Existing plugins continue to run without it.

By default, records are grouped by plugin under the DSH home directory plugin-diagnostics/logs. Each plugin receives at most two 1 MiB files per day, and files older than 14 days are automatically pruned. Log write errors do not interrupt tasks.

Use the record(plugin, level, event, details) service method with controlled plugin identifiers, fixed event names and allowlisted metadata. Runtime captures tool names for recognized plugin tool calls only. It does not capture tool arguments, model output, or user messages.

## Development

Run node --test tests/*.test.mjs. Live integration requires a supported DeepSeek Harness host. The repository does not include any user settings, logs or credentials.
