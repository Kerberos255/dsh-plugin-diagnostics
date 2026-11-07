# DSH 插件诊断（Plugin Diagnostics）

[English](README.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [安全说明](SECURITY.md)

为支持的 DSH 插件提供**可选、脱敏的 JSONL 诊断日志**，便于排查启动、工具调用和定时任务问题。

## 记录内容

- 插件启动、停止及主动提交的受限事件，包含状态、耗时、固定错误码等白名单元数据。
- 计划任务变更通知（**不保存任务正文**）。
- LCM 的有限性能指标，如摘要数量、模型调用、缓存命中及阶段耗时。

**不记录**用户消息、提示词、模型回复、工具参数、HTTP 正文、凭证或任意异常堆栈。未安装诊断插件不会妨碍其他插件正常运行。

## 安装与查看

```sh
dsh plugin --profile desktop add github:Kerberos255/dsh-plugin-diagnostics
```

将 `desktop` 换成实际 Profile，安装或更新后重启 DSH。支持的插件在诊断服务可用时写入日志；**本插件没有独立仪表板**。

日志目录：

```text
DSH_HOME/plugin-diagnostics/logs/<插件名>/YYYY-MM-DD.N.jsonl
```

每个插件每天最多两个 **1 MiB** 文件；超过 **14 天**的记录定期清理。没有事件或日志目录不可写时可能不会生成文件，但不会阻断业务。

## 注意事项

- 日志不能还原会话，也不能替代真实平台测试；历史失败计数不等于刚发生的新错误。
- 即使日志已脱敏，分享前仍需检查操作时间等元数据；详见 [SECURITY.md](SECURITY.md)。

测试：`npm test`。许可：[MIT](LICENSE)。
