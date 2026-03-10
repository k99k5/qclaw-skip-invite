# QClaw Skip Invite

跳过 [QClaw](https://claw.guanjia.qq.com/) 应用的邀请码验证，去除启动时的邀请码弹窗。

## 支持

- QClaw v0.1.1 / v0.1.2（macOS Apple 芯片 / Intel 芯片）

## 使用

```bash
npx qclaw-skip-invite
```

如果 QClaw 正在运行，工具会自动关闭并在完成后重启。该命令可重复执行，已打过补丁会自动跳过。

## 还原

工具会自动备份原始文件，还原只需一行命令：

```bash
APP_ASAR="/Applications/QClaw.app/Contents/Resources/app.asar"
cp "$APP_ASAR.bak" "$APP_ASAR"
```

## 免责声明

本工具仅供学习研究使用，不得用于商业用途。使用本工具所产生的一切后果由使用者自行承担，与作者无关。

## License

[MIT](./LICENSE)
