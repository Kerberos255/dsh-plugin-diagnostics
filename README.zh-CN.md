# DSH 插件诊断（Plugin Diagnostics）

[English](README.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [安全说明](SECURITY.md)

为 DSH 插件提供**可选、脱敏的 JSONL 运行诊断**：记录插件启停、支持的工具调用结果、计划任务变更通知和有限的失败元数据，方便排查问题，不收集对话正文或凭证。

## 记录范围

- 已支持插件的启动、停止等生命周期事件。
- 白名单允许的事件名称、状态、耗时、固定错误码和已识别的工具名称。
- 其他插件通过 `pluginDiagnostics.record(...)` 主动提交的受限诊断事件。
- 计划任务发生变更的通知，**不保存任务内容或具体指令**。

**不会记录**用户消息、Ask User 回答、提示词、模型输出、工具参数、HTTP 请求正文、身份标识、Token/密码或任意异常堆栈。其他插件不依赖它才能正常工作。

## 安装与日志位置

需要兼容的 DSH 宿主服务，具体依赖见 [package.json](package.json)。安装到实际运行插件的 Profile，下面以 `desktop` 为例：

```sh
dsh plugin --profile desktop add github:Kerberos255/dsh-plugin-diagnostics
```

更新插件代码后重启宿主。支持的插件在服务存在时自动写入诊断；它**不是独立监控仪表板，也不要求额外的设置页面**。

日志保存在 `DSH_HOME/plugin-diagnostics/logs/<插件名>/YYYY-MM-DD.N.jsonl`。每个插件每天最多 **2 个 1 MiB 文件**，超过 **14 天**的记录定期清理；日志目录不可写或达到大小限制时会放弃记录，不会中断正常任务。

## 如何排查、有哪些限制？

先确认目标插件和诊断服务都已启动，再查看对应日期的 JSONL。启动日志里的历史失败计数，**不等于本次又失败了这么多次**。诊断信息刻意保持精简，不能用于还原会话正文，也不能替代真实 DSH 或渠道平台的验收。

分享日志前请先阅读 [安全说明](SECURITY.md)，运行元数据仍可能暴露操作时间。使用 `npm test` 验证便携逻辑，`npm pack --dry-run` 检查打包；真实宿主兼容性仍需另行测试。

许可证：[MIT](LICENSE)。
