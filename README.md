# QClaw Skip Invite

跳过 [QClaw](https://claw.guanjia.qq.com/) 应用的邀请码验证，去除启动时的邀请码弹窗。

## 支持

- QClaw v0.1.9+（macOS / Windows）

## 前置要求

- Node.js >= 22

## 使用

```bash
npx qclaw-skip-invite
```

如果 QClaw 正在运行，工具会自动关闭并在完成后重启。该命令可重复执行，已打过补丁会自动跳过。

## 常见问题

### 补丁成功但仍无法使用微信远程等功能

本工具**仅跳过客户端的邀请码输入界面**，不涉及服务器端验证。如果服务器端对邀请码做了校验限制，补丁无法绕过，这是预期行为。

### 大模型 / AI 功能不可用

QClaw 内置的大模型功能依赖官方渠道，同样受服务器端限制。需要自行配置自定义渠道，例如企业微信渠道插件：[openclaw-plugin-wecom](https://github.com/sunnoy/openclaw-plugin-wecom)。

## 还原

重新安装 QClaw 即可还原。

## 免责声明

本工具仅供学习研究使用，不得用于商业用途。使用本工具所产生的一切后果由使用者自行承担，与作者无关。

## License

[MIT](./LICENSE)
