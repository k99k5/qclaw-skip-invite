# [QClaw](https://claw.guanjia.qq.com/) Skip Invite

跳过 QClaw 应用的邀请码验证，去除启动时的邀请码弹窗。

## 支持

- QClaw macOS 所有版本（Apple 芯片 / Intel 芯片）

## 使用

```bash
npx qclaw-skip-invite
```

完成后重启 QClaw 即可。该命令可重复执行，已打过补丁会自动跳过。

## 还原

工具会自动备份原始文件，还原只需一行命令：

```bash
APP_ASAR="/Applications/QClaw.app/Contents/Resources/app.asar"
cp "$APP_ASAR.bak" "$APP_ASAR"
```

## License

[MIT](./LICENSE)
