# Nanobrowser 程序化驱动：可行性结论

## 结论：不可行（外部注入路径被显式封锁），改用「你粘贴任务词」或「CDP 接管」

## 证据（background.js 0.3.0 审计）

1. **面板连接只信任自己的扩展页**
   ```js
   if (n.sender?.id !== chrome.runtime.id || !n.sender?.url?.startsWith(t)) { n.disconnect(); return; }
   ```
   `chrome.runtime.onMessageExternal` 不存在 → 扩展外部无法发送任何命令。

2. **manifest 没有 `externally_connectable`** → 其他扩展/网页连 `chrome.runtime.sendMessage` 会被拒。

3. **`ws://localhost:${port}`** 只是它连接外部浏览器 CDP 的客户端，不是它自己的控制服务；8787 常量是内置诊断面板地址，且 8787 当前并未监听。

4. 诊断入口自己也写着："A web page cannot reach the extension; a panel address with parameters binds nothing."（网页碰不到扩展；带参数的面板地址什么也绑不上。）

## 两条仍然可行的路

### A. 你手动粘贴任务词（最省事，30 秒）
我在下一条消息给出完整任务文本 → 你打开 Nanobrowser 侧边栏 → 粘贴 → 回车。
跑完后把输出整段复制发我，我整理入库。任务可以分两段跑（界面细节 / 结局细节），单段结果更干净。

### B. 我用 Chrome DevTools 协议（CDP）接管整台 Chrome
以 `--remote-debugging-port=9222` 重启 Chrome 后，我可以直接驱动页面（导航、点击、读 DOM），
不经过 Nanobrowser——相当于我自己就是浏览器代理。这需要重启你的 Chrome（会短暂关闭当前标签），
且由我直接操作，效果等同 AutoGLM。

## 推荐

先走 A（立刻能动）；如果你愿意重启 Chrome，B 是长期方案，以后所有实机试玩都不再依赖第三方平台额度。
