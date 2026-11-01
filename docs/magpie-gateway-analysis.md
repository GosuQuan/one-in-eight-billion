# 结论：Magpie 中转网关能不能接 Nanobrowser？

## 结论先行：能用，但有一个 CORS 坑，绕法已给出

## 实测证据（2026-11-02）

| 检查项 | 结果 |
|---|---|
| 网关进程 | `magpie.exe` (PID 31884) 监听 `127.0.0.1:3425` |
| OpenAI 兼容端点 | ✅ `GET /v1/models` 返回标准 `{"data":[...]}` |
| 对话补全 | ✅ `POST /v1/chat/completions`（model: `group/never-stuck`）中英文均正常回包 |
| 可用模型 | `group/never-stuck`（超强思考组，1M 上下文，支持工具调用）、`auto/gpt-6.1-terra`、`auto/gpt-6.1-sol` 等 routing group |
| API Key | 网关不校验 Authorization（本机回环即可用），Nanobrowser 里 Key 随便填 |
| CORS 预检 | ❌ 对 `chrome-extension://` Origin 的 OPTIONS 请求返回 404，无 Access-Control 头 |

## 为什么 CORS 是坑

Nanobrowser 是浏览器扩展，它从扩展页面直接 `fetch` 你的网关时，Chrome 会先发 OPTIONS 预检。
Magpie 网关不处理预检 → 扩展端会直接报连接失败，**即使端点本身完全正常**。

## 两条可行接法（推荐 A）

### A. 主机权限绕过 CORS（不用改任何服务）
Nanobrowser 的 manifest 若声明了 `host_permissions: ["http://*/*"]`（它默认能访问任意站点），
扩展的 background service worker 发起的请求**不受页面 CORS 限制**——实际能否直连取决于它的实现。
**先试最省事的**：Nanobrowser 设置里选「本地」，服务器地址填：
```
http://localhost:3425
```
点「连接」看结果。如果列表能拉出来（显示 group/never-stuck 等模型）就成了。
API 密钥栏随便填一个字符（比如 `local`），因为网关不校验。

### B. 若 A 报 CORS/连接失败：加一层转发
用一条极简本地转发把「无 CORS」变成「有 CORS」——Node 一行服务（60 行以内脚本我已可代写），
监听 `127.0.0.1:11434`，把所有请求原样转发到 `127.0.0.1:3425` 并附上
`Access-Control-Allow-Origin: *`。Nanobrowser 填 `http://localhost:11434`。
（这正好也是它截图里默认的 Ollama 端口，Nanobrowser 对 localhost:11434 有现成预设。）

## Nanobrowser 推荐配置（接法 A）

| 字段 | 值 |
|---|---|
| 服务商 | Ollama（本地） |
| 服务器地址 | `http://localhost:3425` |
| API 密钥 | 任意（如 `local`）——网关不校验 |
| 模型 | `group/never-stuck`（若 Nanobrowser 要求手填模型名） |

## 风险与注意

1. **模型强度**：`group/never-stuck` 是思考组，浏览器代理任务偏慢但质量高；
   若嫌慢可在 Magpie 里换轻量组。
2. **账单归属**：走 Magpie 的路由计费（routing group 的 pricing 字段），不走 AutoGLM 平台。
3. **稳定性**：Magpie 关闭 = Nanobrowser 断粮；长时间跑代理任务时别退出 Magpie。
4. **内容边界**：网关直连无审核层，任务描述仍由我在发送前把关。

## 下一步（配置成功后我立刻执行）

1. 下发 1in8b.life 六节细节采集任务（开局/年度界面/事件弹窗/经济/人物关系/结局）
2. 结果并入 `docs/1in8b-knowledge.md`
3. 按清单继续 P0 动画迭代
