# 本地AI工具箱

把散落在本地目录里的 AI 项目集中到一个面板：**看 README、启动、打开、停止**。

它是一个 DSH bundle（不是某个具体工具、也不是 skill），安装一次后出现在 DSH 侧栏的「本地AI工具箱」入口。

## 能做什么

- **集中展示**：扫描指定目录（含其直接子目录），把识别到的项目显示为卡片。
- **一键启动 / 停止**：按 `package.json` 脚本、Python 入口、Cargo/Go/Maven/Gradle、Docker Compose、Makefile、启动脚本或 README 命令启动项目；停止时终止整个进程组。
- **打开界面**：自动探测本地端口并打开内嵌预览；也可以直接打开 URL、项目目录或 macOS `.app`。
- **读取 README**：详情抽屉里的 README 标签页按需读取项目 README，支持 Markdown、代码块、表格和任务列表。
- **看日志**：启动后可以看实时 stdout/stderr，诊断端口冲突、依赖缺失等问题。
- **分类展示**：自动识别为「知识库 / 工具 / 小游戏 / 外部工具」，也可以在编辑里改成自定义分类；顶部默认「全部」，点分类只看该类工具。
- **收藏与排序**：点卡片或详情里的星标即可收藏，收藏工具始终置顶；其余按最近使用时间排序，用过、打开过的工具会自动排到前面。
- **自由添加**：除了自动扫描，还可以手动添加目录、可执行文件或一个纯 URL 工具。
- **编辑配置**：名称、介绍、文件/应用路径、启动命令、启动参数、工作目录和网页地址都能在详情里修改；扫描发现的项目会保留人工修改，重新扫描不会覆盖，也可以一键恢复自动识别。
- **不复制项目**：只记录路径和启动方式，不复制项目文件。

## 安装

从 npm 安装（发布后）：

```bash
dsh plugin --profile desktop add dsh-ai-toolbox
```

本地开发时直接从目录安装：

```bash
dsh plugin --profile desktop add /absolute/path/to/dsh-ai-toolbox
```

也可以在 DSH 的「Plugins → Add plugin」里输入包名 `dsh-ai-toolbox`，或输入本地绝对路径。

安装后 DSH 会通过 HMR 重新组合 profile；如果侧栏没有立即出现，刷新一次页面即可。重启 DSH 也一定会生效。

## 发布到 npm

当前包名 `dsh-ai-toolbox` 在 npm 上可用；如果要放到自己的 scope 下，把下面所有 `dsh-ai-toolbox` 换成 `@your-scope/dsh-ai-toolbox`。

```bash
cd dsh-ai-toolbox
npm login
npm version patch          # 更新版本号，例如 0.1.0 → 0.1.1
npm run build
npm pack --dry-run         # 确认 lib/client.js、lib/index.js、cordis.patch.yml、locale 都在包里
npm publish --access public
```

发布后在一个干净的 profile 里验证：

```bash
dsh plugin --profile aitest add dsh-ai-toolbox
dsh --profile aitest --no-open --port 0
```

也可以不走 npm，直接发 tarball 给团队：

```bash
npm pack
dsh plugin --profile desktop add ./dsh-ai-toolbox-0.1.0.tgz
```

DSH 的 Plugins 页面安装包时会自动把 bundle 加进 profile；不需要手动改 `package.json` 的 `dsh.profile.bundles`。

如果 npm 报 `Your cache folder contains root-owned files`，先修复缓存权限：

```bash
sudo chown -R 501:20 ~/.npm
```

> `npm publish` 只保证用户能用 `dsh plugin add dsh-ai-toolbox` 或在 Plugins 里按包名安装。若还想出现在 Plugins 的 Discover 市场列表，需要另外准备 DSH 的 format 1 market index 条目，并让用户添加该索引；自用或团队分发不必做这一步。

## 使用

### 自动扫描

首次打开时会尝试使用这些目录（存在的才会加入）：

```text
~/Documents/deepseek-harness
~/Documents/GitHub
~/Documents/Projects
~/Projects
~/projects
~/code
~/Code
```

每个目录只扫描**直接子目录**，不会递归遍历整个磁盘；`node_modules`、`.git`、`dist`、`build`、`.venv` 等目录会跳过。

### 添加目录

面板顶部「添加目录」→ 输入绝对路径或 `~/...`。添加后会立即扫描该目录的直接子目录。

### 添加单个工具

「添加工具」支持三种方式：

1. **项目目录**：指定一个目录，可覆盖启动命令、参数、工作目录和 URL。
2. **可执行文件**：直接选择一个可执行文件（脚本、二进制、`.command` 等）。
3. **网址**：只登记一个 URL，不启动任何进程。

### 例子：直接启动一条独立命令

像 `~/.local/bin/codebase-memory-mcp --ui=true --port=9749` 这样本来就是前台进程、用 `Ctrl+C` 停止的工具，用「添加工具」→「可执行文件 / 应用」登记：

- **文件或 .app 路径**：`~/.local/bin/codebase-memory-mcp`
- **启动参数**：`--ui=true --port=9749`（不要把参数填进路径或启动命令）
- **工作目录**：`~`（或留空）
- **网页地址**：`http://localhost:9749`
- **显示名称**：例如 `Codebase Memory MCP`

保存后点「启动」，工具会在后台运行；点「停止」会终止整个进程组，效果相当于在终端里 `Ctrl+C`，不需要专门留一个终端窗口。路径和命令里的 `~` 会自动展开为 home 目录。

### 为什么终端能跑、放进工具箱却退出？

有些工具（例如 stdio MCP）在没有终端输入时会立刻收到 EOF 并退出。工具箱现在会为子进程保留一个打开的 stdin，所以 `codebase-memory-mcp --ui=true --port=9749` 这类命令可以在后台持续运行，停止按钮再终止它。

如果启动时提示“检测到该地址已有实例在运行”，说明端口已被另一个不是工具箱启动的进程占用。先停掉旧实例，或直接用「打开」访问已有实例。

### 分类

新扫描或添加的工具会自动归入一个分类；点卡片「详情 → 编辑配置」可以修改分类，也可以输入自定义名称。顶部分类栏默认选中「全部」，选择某个分类后只显示该分类下的工具；搜索和运行状态筛选会叠加生效。

### 卡片操作

- **启动**：拉起进程；如果探测到本地 URL，会显示「打开」。
- **打开**：优先打开内嵌预览；预览被目标站点禁止 iframe 时，可以点「新标签页」。
- **详情**：查看概览、分类、README、日志；也可以收藏、复制路径/URL、在 Finder 中显示、移除工具。
- **编辑配置**：详情里的「编辑配置」可以改名称、介绍、路径、启动命令/启动参数、工作目录和网页地址。可执行文件类型会把「路径」和「启动参数」分开，路径填可执行文件，参数填 `--ui=true --port=9749` 这类内容；项目类型则填整条启动命令。带空格的参数请用引号。修改后如果工具正在运行，需要停止再启动。扫描发现的项目修改后会显示「已修改」，重新扫描仍然保留；点「恢复自动识别」可以丢弃这些修改。
- **停止**：终止该工具及其子进程。

## 识别规则

启动方式按以下优先级推断：

1. `package.json` 的 `dev` / `start` / `serve` / `preview` / `web` / `ui` / `app` / `run` 脚本（自动识别 npm / pnpm / yarn / bun）。
2. `package.json` 的 `bin` 或 `main`。
3. Python：`manage.py`、`app.py`（自动识别 Streamlit / Gradio / Flask / FastAPI）、`main.py`、`server.py`。
4. `Cargo.toml`、`go.mod`、`docker-compose.yml`。
5. Spring Boot 的 Maven / Gradle 项目、`.csproj`。
6. 只有 `index.html` 的静态项目：用 `python3 -m http.server` 起一个本地端口（端口由项目路径稳定计算，避免互相冲突）。
7. `start.sh` / `run-server.sh` 等启动脚本、`Makefile` 的 `dev/start/run/serve` 目标。
8. `.app` 或可执行文件。
9. README 里的命令。

URL 来源包括框架默认端口、脚本里的 `--port`、`.env` 的 `PORT`、README 中的 `localhost` / `127.0.0.1` / `0.0.0.0:端口`，以及进程启动后 stdout/stderr 里打印的本地地址。

## 数据位置

默认保存在：

```text
~/.dsh/ai-toolbox/tools.json
~/.dsh/ai-toolbox/logs/
```

也可以通过 Host 配置修改：

```yaml
- id: ai-toolbox
  config:
    dataDir: ~/.dsh/ai-toolbox
    directories:
      - ~/Documents/GitHub
      - ~/work/ai
    startTimeoutMs: 30000
    logBytes: 196608
```

`directories` 一旦配置，就作为初始目录；之后在界面里增删的目录仍以 `tools.json` 为准。

## 安全说明

- 启动命令来自项目自身的 `package.json`、README、Makefile 或启动脚本；**启动前请确认项目可信**。这个面板不会执行 shell 字符串，所有命令都以 argv 数组传给 `ctx.subprocess`。
- 所有进程都由 DSH 的 subprocess 能力托管；插件卸载、重载或 DSH 退出时会清理受管进程。
- README 在浏览器端渲染前会做 HTML 转义，只允许 `http(s)` / `mailto` 链接。
- 内嵌预览受目标站点的 `X-Frame-Options` / CSP 限制；被拒绝时使用「新标签页」。

## 开发

```bash
npm install
npm run build     # 构建 lib/client.js
npm run watch     # 监听 src/client 变化
node test/selftest.mjs
```

自测覆盖：目录扫描、README 读取、启动真实 Node 服务、探测 URL、打开、停止、运行时添加目录、添加/移除可执行文件。

## 当前限制

- 目录扫描只到直接子目录；更深层的项目请直接添加其目录。
- 不能保证识别所有自定义启动方式；识别不到时，可以把它的启动脚本或可执行文件单独添加，或添加它已经运行起来的网址。
- 非 Web 工具只能打开可执行文件/`.app`，面板无法嵌入原生窗口。
- Windows 使用 `taskkill` 结束应用，macOS 使用 `osascript`/`pkill`，Linux 使用 `pkill`；不同平台的退出行为可能略有差异。