import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { renderMarkdown } from './markdown.js'
import { STYLES } from './styles.js'

const API = 'ai-toolbox'
const STYLE_ID = 'dsh-ai-toolbox-styles'

if (typeof document !== 'undefined' && document.getElementById(STYLE_ID) === null) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.dataset.plugin = 'dsh-ai-toolbox'
  style.textContent = STYLES
  document.head.appendChild(style)
}

async function api(path, body) {
  let response
  try {
    response = await fetch(`${API}/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch (error) {
    throw new Error(`无法连接本地AI工具箱：${error?.message ?? error}`)
  }
  let payload = null
  try { payload = await response.json() } catch { /* an empty error body is reported below */ }
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message || `请求失败（HTTP ${response.status}）`)
  }
  return payload
}

function formatTime(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value))
  } catch { return '' }
}

const KIND_LABEL = { project: '项目', url: '网址', app: '应用', executable: '可执行文件' }
const CATEGORY_ALL = '全部'
const UNSORTED_CATEGORY = '未分类'
const CATEGORY_OPTIONS = ['知识库', '工具', '小游戏', '外部工具']
const KIND_ICON = { project: '🤖', url: '🌐', app: '🖥️', executable: '⌘' }
const STATUS_LABEL = {
  stopped: '未启动',
  starting: '启动中',
  running: '运行中',
  stopping: '停止中',
  error: '异常',
  opened: '已打开',
  external: '外部运行',
}

function isLive(tool) {
  return ['running', 'starting', 'stopping'].includes(tool.runtime?.status)
}

function canManage(tool) {
  return (tool.kind === 'project' || tool.kind === 'executable') && Boolean(tool.launch?.command)
}

function canOpen(tool) {
  return Boolean(tool.url) || tool.kind === 'app' || Boolean(tool.launch) || Boolean(tool.path)
}

function statusOf(tool) {
  return tool.runtime?.status || 'stopped'
}

function Icon({ name, size = 16 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  if (name === 'spark') {
    return (
      <svg {...common}>
        <path d="M12 3.2l1.75 4.9L18.8 9.8l-5.05 1.7L12 16.5l-1.75-5L5.2 9.8l5.05-1.7L12 3.2Z" />
        <path d="M18.4 15.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      </svg>
    )
  }
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.2 4.2" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'refresh') return <svg {...common}><path d="M20 11a8 8 0 1 0-2.2 5.6" /><path d="M20 4v7h-7" /></svg>
  if (name === 'play') return <svg {...common}><path d="M8 5.5v13l10-6.5L8 5.5Z" /></svg>
  if (name === 'stop') return <svg {...common}><rect x="7" y="7" width="10" height="10" rx="1.8" /></svg>
  if (name === 'external') return <svg {...common}><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
  if (name === 'book') return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /><path d="M8 7h8M8 11h6" /></svg>
  if (name === 'edit') return <svg {...common}><path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z" /><path d="m13.5 6.5 3 3" /></svg>
  if (name === 'star') return <svg {...common}><path d="m12 3.7 2.6 5.25 5.8.84-4.2 4.1 1 5.77L12 16.93l-5.2 2.73 1-5.77-4.2-4.1 5.8-.84L12 3.7Z" /></svg>
  if (name === 'starFilled') return <svg {...common}><path d="m12 3.7 2.6 5.25 5.8.84-4.2 4.1 1 5.77L12 16.93l-5.2 2.73 1-5.77-4.2-4.1 5.8-.84L12 3.7Z" fill="currentColor" /></svg>
  if (name === 'terminal') return <svg {...common}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="m7.5 9 3 3-3 3M13 15h3.5" /></svg>
  if (name === 'close') return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>
  if (name === 'trash') return <svg {...common}><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
  if (name === 'copy') return <svg {...common}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /></svg>
  if (name === 'folder') return <svg {...common}><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" /></svg>
  if (name === 'chevron') return <svg {...common}><path d="m9 6 6 6-6 6" /></svg>
  return null
}

function SidebarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 10.4v3.2M5.9 12h4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="15.4" cy="11" r="1.05" fill="currentColor" />
      <circle cx="18.1" cy="11" r="1.05" fill="currentColor" />
      <path d="M15.2 14.1c.7.55 1.5.8 2.4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Status({ tool }) {
  const status = statusOf(tool)
  const pulse = status === 'starting' || status === 'stopping'
  return (
    <span className="ait-status" data-status={status} title={tool.runtime?.message || STATUS_LABEL[status]}>
      <span className="ait-dot" />
      {pulse ? <span className="ait-spinner" /> : null}
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function ToolCard({ tool, busy, onStart, onStop, onOpen, onDetail, onFavorite }) {
  const status = statusOf(tool)
  const working = busy?.id === tool.id
  const startable = canManage(tool)
  const openable = canOpen(tool)
  const launchLabel = tool.launch?.label || ''
  return (
    <article className="ait-card" data-status={status}>
      <div className="ait-card-top">
        <div className="ait-icon" data-kind={tool.kind}>{KIND_ICON[tool.kind] || '🤖'}</div>
        <div className="ait-card-heading">
          <h3 className="ait-card-name" title={tool.name}>{tool.name}</h3>
          <div className="ait-badges">
            <span className="ait-badge ait-badge-kind">{KIND_LABEL[tool.kind] || tool.kind}</span>
            <span className="ait-badge ait-badge-category">{tool.category || '未分类'}</span>
            {tool.origin === 'manual' ? <span className="ait-badge">手动添加</span> : null}
            {tool.edited ? <span className="ait-badge">已修改</span> : null}
            {tool.hasReadme ? <span className="ait-badge">README</span> : null}
            {tool.tags?.slice(0, 1).map((tag) => <span className="ait-badge" key={tag}>{tag}</span>)}
          </div>
        </div>
        <Status tool={tool} />
      </div>

      <p className="ait-desc" title={tool.description}>{tool.description || '暂无介绍'}</p>
      <div className="ait-path" title={tool.path}>{tool.path}</div>

      <div className="ait-run-line">
        {tool.url ? (
          <a href={tool.url} target="_blank" rel="noreferrer noopener" title={tool.url}>🔗 {tool.url}</a>
        ) : launchLabel ? (
          <code title={launchLabel}>{launchLabel}</code>
        ) : (
          <span>仅文档 / 未识别启动命令</span>
        )}
      </div>

      <div className="ait-card-actions">
        {startable ? (
          isLive(tool) ? (
            <button className="ait-btn ait-btn-sm" disabled={working} onClick={() => onStop(tool)}>
              {working ? <span className="ait-spinner" /> : <Icon name="stop" size={14} />}
              停止
            </button>
          ) : (
            <button className="ait-btn ait-btn-sm" disabled={working} onClick={() => onStart(tool)}>
              {working ? <span className="ait-spinner" /> : <Icon name="play" size={14} />}
              {status === 'error' ? '重新启动' : '启动'}
            </button>
          )
        ) : tool.kind === 'app' && status === 'opened' ? (
          <button className="ait-btn ait-btn-sm" disabled={working} onClick={() => onStop(tool)}>
            {working ? <span className="ait-spinner" /> : <Icon name="stop" size={14} />}
            退出应用
          </button>
        ) : null}

        {openable ? (
          <button className="ait-btn ait-btn-sm ait-btn-primary" disabled={working} onClick={() => onOpen(tool)}>
            {working ? <span className="ait-spinner" /> : <Icon name="external" size={14} />}
            打开
          </button>
        ) : null}

        <span className="ait-spacer" />
        <button
          className="ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost ait-star"
          data-active={tool.favorite}
          onClick={() => onFavorite(tool)}
          aria-label={tool.favorite ? '取消收藏' : '收藏'}
          title={tool.favorite ? '取消收藏' : '收藏，置顶显示'}
        >
          <Icon name={tool.favorite ? 'starFilled' : 'star'} size={15} />
        </button>
        <button className="ait-btn ait-btn-sm ait-btn-ghost" onClick={() => onDetail(tool)}>
          详情
        </button>
      </div>
    </article>
  )
}

function Markdown({ source }) {
  const html = useMemo(() => renderMarkdown(source), [source])
  return <div className="ait-md" dangerouslySetInnerHTML={{ __html: html }} />
}

function DetailDrawer({ tool, busy, onClose, onStart, onStop, onOpen, onReveal, onRemove, onEdit, onFavorite, showToast }) {
  const [tab, setTab] = useState('overview')
  const [readme, setReadme] = useState(null)
  const [readmeError, setReadmeError] = useState('')
  const [logs, setLogs] = useState(null)
  const [logsError, setLogsError] = useState('')
  const logRef = useRef(null)

  const working = busy?.id === tool.id

  useEffect(() => {
    let cancelled = false
    setReadme(null)
    setReadmeError('')
    if (tab !== 'readme') return () => { cancelled = true }
    api(`readme?id=${encodeURIComponent(tool.id)}`)
      .then((payload) => { if (!cancelled) setReadme(payload) })
      .catch((error) => { if (!cancelled) setReadmeError(error.message) })
    return () => { cancelled = true }
  }, [tab, tool.id])

  const loadLogs = useCallback(() => {
    api(`logs?id=${encodeURIComponent(tool.id)}`)
      .then((payload) => {
        setLogs(payload)
        setLogsError('')
        requestAnimationFrame(() => {
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
        })
      })
      .catch((error) => setLogsError(error.message))
  }, [tool.id])

  useEffect(() => {
    if (tab !== 'logs') return undefined
    loadLogs()
    const timer = setInterval(loadLogs, 1200)
    return () => clearInterval(timer)
  }, [tab, loadLogs])

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value)
      showToast('已复制')
    } catch {
      showToast('复制失败，请手动选择文本', 'error')
    }
  }

  return (
    <div className="ait-overlay ait-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="ait-drawer" role="dialog" aria-modal="true" aria-label={tool.name} onMouseDown={(event) => event.stopPropagation()}>
        <div className="ait-drawer-head">
          <div className="ait-icon" data-kind={tool.kind}>{KIND_ICON[tool.kind] || '🤖'}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="ait-drawer-title">{tool.name}</h2>
            <div className="ait-drawer-sub" title={tool.path}>{tool.path}</div>
          </div>
          <Status tool={tool} />
          <button
            className="ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost ait-star"
            data-active={tool.favorite}
            onClick={() => onFavorite(tool)}
            aria-label={tool.favorite ? '取消收藏' : '收藏'}
            title={tool.favorite ? '取消收藏' : '收藏，置顶显示'}
          >
            <Icon name={tool.favorite ? 'starFilled' : 'star'} size={16} />
          </button>
          <button className="ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost" onClick={() => onEdit(tool)} aria-label="编辑配置" title="编辑配置">
            <Icon name="edit" size={16} />
          </button>
          <button className="ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="ait-tabs" role="tablist">
          <button className="ait-tab" data-active={tab === 'overview'} onClick={() => setTab('overview')} role="tab">概览</button>
          <button className="ait-tab" data-active={tab === 'readme'} onClick={() => setTab('readme')} role="tab">README</button>
          <button className="ait-tab" data-active={tab === 'logs'} onClick={() => setTab('logs')} role="tab">日志</button>
        </div>

        <div className="ait-drawer-body">
          {tab === 'overview' ? (
            <>
              <div className="ait-detail-actions">
                {canManage(tool) ? (
                  isLive(tool) ? (
                    <button className="ait-btn" disabled={working} onClick={() => onStop(tool)}>
                      {working ? <span className="ait-spinner" /> : <Icon name="stop" size={15} />} 停止
                    </button>
                  ) : (
                    <button className="ait-btn" disabled={working} onClick={() => onStart(tool)}>
                      {working ? <span className="ait-spinner" /> : <Icon name="play" size={15} />} 启动
                    </button>
                  )
                ) : tool.kind === 'app' && statusOf(tool) === 'opened' ? (
                  <button className="ait-btn" disabled={working} onClick={() => onStop(tool)}>
                    {working ? <span className="ait-spinner" /> : <Icon name="stop" size={15} />} 退出应用
                  </button>
                ) : null}
                {canOpen(tool) ? (
                  <button className="ait-btn ait-btn-primary" disabled={working} onClick={() => onOpen(tool)}>
                    {working ? <span className="ait-spinner" /> : <Icon name="external" size={15} />} 打开
                  </button>
                ) : null}
                <button className="ait-btn" disabled={working} onClick={() => onEdit(tool)}>
                  <Icon name="edit" size={15} /> 编辑配置
                </button>
                <button className="ait-btn" disabled={working} onClick={() => onReveal(tool)}>
                  <Icon name="folder" size={15} /> 显示位置
                </button>
                <button className="ait-btn ait-btn-danger" disabled={working} onClick={() => onRemove(tool)}>
                  <Icon name="trash" size={15} /> 移除
                </button>
              </div>

              <dl className="ait-kv">
                <dt>介绍</dt><dd>{tool.description || '暂无介绍'}</dd>
                <dt>类型</dt><dd>{KIND_LABEL[tool.kind] || tool.kind}{tool.origin === 'manual' ? ' · 手动添加' : ' · 扫描发现'}{tool.edited ? ' · 已修改' : ''}</dd>
                <dt>分类</dt><dd>{tool.category || '未分类'}</dd>
                <dt>路径</dt><dd><code>{tool.path}</code></dd>
                {tool.launch ? <dt>启动命令</dt> : null}
                {tool.launch ? <dd><code>{tool.launch.label}</code><br /><span className="ait-muted">工作目录：{tool.launch.cwd}</span></dd> : null}
                {tool.url ? <dt>访问地址</dt> : null}
                {tool.url ? (
                  <dd>
                    <a href={tool.url} target="_blank" rel="noreferrer noopener">{tool.url}</a>
                    <button className="ait-btn ait-btn-sm ait-btn-ghost" onClick={() => copy(tool.url)}>复制</button>
                  </dd>
                ) : null}
                <dt>状态</dt><dd>{STATUS_LABEL[statusOf(tool)] || statusOf(tool)}{tool.runtime?.message ? ` · ${tool.runtime.message}` : ''}</dd>
                <dt>最近使用</dt><dd>{tool.lastUsedAt ? formatTime(tool.lastUsedAt) : '尚未使用'}</dd>
                {tool.runtime?.startedAt ? <><dt>启动时间</dt><dd>{formatTime(tool.runtime.startedAt)}</dd></> : null}
                {tool.runtime?.exitCode != null ? <><dt>退出码</dt><dd>{tool.runtime.exitCode}</dd></> : null}
              </dl>

              {tool.tags?.length ? (
                <>
                  <div className="ait-section-title">标签</div>
                  <div className="ait-tags">{tool.tags.map((tag) => <span className="ait-badge" key={tag}>{tag}</span>)}</div>
                </>
              ) : null}

              <div className="ait-section-title">README</div>
              {tool.hasReadme ? (
                <button className="ait-btn" onClick={() => setTab('readme')}>
                  <Icon name="book" size={15} /> 阅读 README
                </button>
              ) : <span className="ait-muted">这个项目没有 README。</span>}
            </>
          ) : null}

          {tab === 'readme' ? (
            readmeError ? <div className="ait-form-error">{readmeError}</div>
              : readme === null ? <div className="ait-skeleton" style={{ height: 220 }} />
                : readme.missing ? <div className="ait-log-empty">没有找到 README 文件。</div>
                  : (
                    <>
                      <div className="ait-muted" style={{ fontSize: 11, marginBottom: 12 }}>
                        {readme.path}{readme.truncated ? ' · 仅显示前 512 KB' : ''}
                      </div>
                      <Markdown source={readme.markdown} />
                    </>
                  )
          ) : null}

          {tab === 'logs' ? (
            logsError ? <div className="ait-form-error">{logsError}</div>
              : logs === null ? <div className="ait-skeleton" style={{ height: 220 }} />
                : (
                  <>
                    <div className="ait-detail-actions">
                      <button className="ait-btn ait-btn-sm" onClick={loadLogs}>
                        <Icon name="refresh" size={14} /> 刷新日志
                      </button>
                      <span className="ait-muted" style={{ fontSize: 11 }}>{logs.message || STATUS_LABEL[logs.status] || logs.status}</span>
                    </div>
                    {logs.logs ? <pre className="ait-logs" ref={logRef}>{logs.logs}</pre>
                      : <div className="ait-log-empty">暂无日志。启动这个工具后，输出会显示在这里。</div>}
                  </>
                )
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function AddDialog({ initialMode, onClose, onDone, showToast }) {
  const [mode, setMode] = useState(initialMode || 'directory')
  const [form, setForm] = useState({
    path: '', name: '', args: '', cwd: '', url: '', description: '', category: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      let result
      if (mode === 'directory') {
        result = await api('add-directory', { path: form.path })
      } else if (mode === 'url') {
        result = await api('add', {
          mode: 'url', name: form.name, url: form.url, description: form.description, category: form.category,
        })
      } else {
        result = await api('add', {
          mode: 'executable', name: form.name, path: form.path, args: form.args,
          cwd: form.cwd, url: form.url, description: form.description, category: form.category,
        })
      }
      showToast(mode === 'directory' ? '目录已添加并扫描' : '工具已添加')
      onDone(result.state)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ait-overlay ait-modal-backdrop" onMouseDown={onClose}>
      <form className="ait-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <h2>添加本地 AI 工具</h2>
        <p className="ait-muted">添加项目目录、可执行文件或一个网址。扫描只会读取目录，不会修改项目文件。</p>

        <div className="ait-segment">
          <button type="button" data-active={mode === 'directory'} onClick={() => setMode('directory')}>项目目录</button>
          <button type="button" data-active={mode === 'executable'} onClick={() => setMode('executable')}>可执行文件 / 应用</button>
          <button type="button" data-active={mode === 'url'} onClick={() => setMode('url')}>网址</button>
        </div>

        {mode === 'directory' ? (
          <div className="ait-field">
            <label htmlFor="ait-dir-path">目录绝对路径</label>
            <input
              id="ait-dir-path" autoFocus value={form.path} onChange={update('path')}
              placeholder="例如 /Users/me/Documents/deepseek-harness"
            />
            <span className="ait-field-hint">会扫描该目录本身和下一层子目录中的项目，并自动识别启动命令和 localhost 地址。</span>
          </div>
        ) : null}

        {mode === 'executable' ? (
          <>
            <div className="ait-field">
              <label htmlFor="ait-exe-path">文件或 .app 路径</label>
              <input id="ait-exe-path" autoFocus value={form.path} onChange={update('path')} placeholder="例如 /Applications/MyTool.app 或 /path/to/run.sh" />
              <span className="ait-field-hint">支持 macOS .app、二进制文件、.command / .sh 脚本，也支持一个项目目录。</span>
            </div>
            <div className="ait-field">
              <label htmlFor="ait-exe-name">显示名称（可选）</label>
              <input id="ait-exe-name" value={form.name} onChange={update('name')} placeholder="默认使用文件名" />
            </div>
            <div className="ait-field">
              <label htmlFor="ait-exe-args">启动参数（可选）</label>
              <input id="ait-exe-args" value={form.args} onChange={update('args')} placeholder='例如 --port 3000 --host 127.0.0.1' />
            </div>
            <div className="ait-field">
              <label htmlFor="ait-exe-cwd">工作目录（可选）</label>
              <input id="ait-exe-cwd" value={form.cwd} onChange={update('cwd')} placeholder="默认使用文件所在目录" />
            </div>
          </>
        ) : null}

        {mode === 'url' ? (
          <>
            <div className="ait-field">
              <label htmlFor="ait-url">网址</label>
              <input id="ait-url" autoFocus value={form.url} onChange={update('url')} placeholder="http://localhost:3000" />
            </div>
            <div className="ait-field">
              <label htmlFor="ait-url-name">显示名称（可选）</label>
              <input id="ait-url-name" value={form.name} onChange={update('name')} placeholder="例如 我的图像生成器" />
            </div>
          </>
        ) : null}

        {mode !== 'directory' ? (
          <>
            {mode === 'executable' ? (
              <div className="ait-field">
                <label htmlFor="ait-exe-url">网页地址（可选）</label>
                <input id="ait-exe-url" value={form.url} onChange={update('url')} placeholder="如果这个程序会启动本地网页，可填 http://localhost:..." />
              </div>
            ) : null}
            <div className="ait-field">
              <label htmlFor="ait-category">分类（可选）</label>
              <input
                id="ait-category" list="ait-category-options" value={form.category}
                onChange={update('category')} placeholder="例如 知识库、工具、小游戏、外部工具"
              />
              <datalist id="ait-category-options">
                {CATEGORY_OPTIONS.map((item) => <option key={item} value={item} />)}
              </datalist>
              <span className="ait-field-hint">留空会自动识别；也可以输入自定义分类，之后在顶部按分类筛选。</span>
            </div>
            <div className="ait-field">
              <label htmlFor="ait-desc">介绍（可选）</label>
              <textarea id="ait-desc" rows={3} value={form.description} onChange={update('description')} placeholder="一句话说明这个工具能做什么" />
            </div>
          </>
        ) : null}

        {error ? <div className="ait-form-error">{error}</div> : null}

        <div className="ait-form-actions">
          <button type="button" className="ait-btn" onClick={onClose} disabled={submitting}>取消</button>
          <button type="submit" className="ait-btn ait-btn-primary" disabled={submitting || (mode === 'directory' ? !form.path.trim() : mode === 'url' ? !form.url.trim() : !form.path.trim())}>
            {submitting ? <span className="ait-spinner" /> : null}
            {mode === 'directory' ? '添加并扫描' : '添加'}
          </button>
        </div>
      </form>
    </div>
  )
}

function quoteArg(value) {
  const text = String(value)
  if (!/[\s"']/.test(text)) return text
  if (!text.includes('"')) return `"${text}"`
  if (!text.includes("'")) return `'${text}'`
  return `"${text.replace(/"/g, '')}"`
}

function formatArgs(args) {
  return (args ?? []).map(quoteArg).join(' ')
}

function EditDialog({ tool, onClose, onSaved, showToast }) {
  const canUrl = tool.kind !== 'app'
  const canPath = tool.kind !== 'url'
  const canCommand = tool.kind === 'project'
  const canArgs = tool.kind === 'executable'
  const pathLabel = tool.kind === 'project' ? '项目目录' : '文件或 .app 路径'
  const [form, setForm] = useState({
    name: tool.name || '',
    description: tool.description || '',
    category: tool.category || '未分类',
    path: tool.path || '',
    command: tool.launch?.label || '',
    args: formatArgs(tool.launch?.args),
    cwd: tool.launch?.cwd || '',
    url: tool.url || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('名称不能为空'); return }
    const patch = {
      id: tool.id,
      name: form.name,
      description: form.description,
    }
    if (form.category.trim() !== (tool.category || '未分类')) patch.category = form.category
    if (canPath && form.path.trim() !== (tool.path || '')) patch.path = form.path
    if (canCommand && form.command.trim() !== (tool.launch?.label || '')) patch.command = form.command
    if (canArgs && form.args.trim() !== formatArgs(tool.launch?.args)) patch.args = form.args
    if ((canCommand || canArgs) && form.cwd.trim() !== (tool.launch?.cwd || '')) patch.cwd = form.cwd
    if (canUrl && (tool.kind === 'url' || form.url.trim() !== (tool.url || ''))) {
      patch.url = form.url
    }
    setSubmitting(true)
    try {
      const payload = await api('update', patch)
      onSaved(payload)
      showToast(payload.tool?.runtime?.message || '配置已保存')
      onClose()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = async () => {
    if (!window.confirm('恢复自动识别会丢弃这个工具的名称、介绍、分类、路径、启动命令和网址修改，确定继续？')) return
    setError('')
    setSubmitting(true)
    try {
      const payload = await api('reset', { id: tool.id })
      onSaved(payload)
      showToast('已恢复自动识别')
      onClose()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ait-overlay ait-modal-backdrop" onMouseDown={onClose}>
      <form className="ait-modal ait-edit-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <h2>编辑工具配置</h2>
        <p className="ait-muted">修改路径、启动命令或工作目录后，如果工具正在运行，请停止后重新启动。</p>

        <div className="ait-field">
          <label htmlFor="ait-edit-name">名称</label>
          <input id="ait-edit-name" autoFocus value={form.name} onChange={update('name')} placeholder="工具显示名称" />
        </div>
        <div className="ait-field">
          <label htmlFor="ait-edit-description">介绍</label>
          <textarea id="ait-edit-description" rows={3} value={form.description} onChange={update('description')} placeholder="一句话说明这个工具能做什么" />
        </div>
        <div className="ait-field">
          <label htmlFor="ait-edit-category">分类</label>
          <input
            id="ait-edit-category" list="ait-edit-category-options" value={form.category}
            onChange={update('category')} placeholder="例如 知识库、工具、小游戏、外部工具"
          />
          <datalist id="ait-edit-category-options">
            {[...CATEGORY_OPTIONS, tool.category].filter(Boolean).filter((item, index, list) => list.indexOf(item) === index).map((item) => <option key={item} value={item} />)}
          </datalist>
          <span className="ait-field-hint">分类会显示在卡片和详情里；顶部可按分类筛选，留空保存为「未分类」。</span>
        </div>

        {canPath ? (
          <div className="ait-field">
            <label htmlFor="ait-edit-path">{pathLabel}</label>
            <input id="ait-edit-path" value={form.path} onChange={update('path')} placeholder={tool.kind === 'project' ? '/path/to/project' : '/path/to/tool'} spellCheck={false} />
            <span className="ait-field-hint">修改后会立即用于打开和启动；扫描发现的项目改路径后，重新扫描也不会丢失。</span>
          </div>
        ) : null}

        {canCommand ? (
          <div className="ait-field">
            <label htmlFor="ait-edit-command">启动命令（含参数）</label>
            <input
              id="ait-edit-command" value={form.command} onChange={update('command')}
              placeholder="例如 npm run dev 或 python3 app.py"
            />
            <span className="ait-field-hint">按 argv 执行；带空格的路径或参数请用引号。留空保持当前自动识别结果。</span>
          </div>
        ) : null}

        {canArgs ? (
          <div className="ait-field">
            <label htmlFor="ait-edit-args">启动参数</label>
            <input
              id="ait-edit-args" value={form.args} onChange={update('args')}
              placeholder="例如 --ui=true --port=9749"
              spellCheck={false}
            />
            <span className="ait-field-hint">只填参数，不要填可执行文件路径；可执行文件由上面的路径决定。</span>
          </div>
        ) : null}

        {canCommand || canArgs ? (
          <div className="ait-field">
            <label htmlFor="ait-edit-cwd">工作目录</label>
            <input id="ait-edit-cwd" value={form.cwd} onChange={update('cwd')} placeholder={tool.path} />
            <span className="ait-field-hint">必须是一个已存在的目录；留空使用项目目录或可执行文件所在目录。</span>
          </div>
        ) : null}

        {canUrl ? (
          <div className="ait-field">
            <label htmlFor="ait-edit-url">网页地址</label>
            <input id="ait-edit-url" value={form.url} onChange={update('url')} placeholder="http://localhost:3000" />
            <span className="ait-field-hint">用于「打开」和卡片上的网址；留空表示不使用固定网址。</span>
          </div>
        ) : null}

        {tool.origin === 'scan' ? (
          <span className="ait-field-hint">这是扫描发现的项目，上面的修改会覆盖自动识别结果，多次重新扫描也不会丢失。</span>
        ) : null}

        {error ? <div className="ait-form-error">{error}</div> : null}

        <div className="ait-form-actions">
          {tool.origin === 'scan' ? (
            <button type="button" className="ait-btn" onClick={reset} disabled={submitting}>恢复自动识别</button>
          ) : null}
          <span className="ait-spacer" />
          <button type="button" className="ait-btn" onClick={onClose} disabled={submitting}>取消</button>
          <button type="submit" className="ait-btn ait-btn-primary" disabled={submitting}>
            {submitting ? <span className="ait-spinner" /> : null} 保存
          </button>
        </div>
      </form>
    </div>
  )
}

function PreviewModal({ preview, onClose }) {
  const openExternal = () => window.open(preview.url, '_blank', 'noopener,noreferrer')
  return (
    <div className="ait-overlay ait-modal-backdrop" onMouseDown={onClose}>
      <div className="ait-preview-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ait-preview-head">
          <div className="ait-icon" style={{ width: 30, height: 30, fontSize: 15 }}>🌐</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="ait-preview-title">{preview.name}</div>
            <div className="ait-preview-url">{preview.url}</div>
          </div>
          <button className="ait-btn ait-btn-sm" onClick={openExternal}>
            <Icon name="external" size={14} /> 新标签页
          </button>
          <button className="ait-btn ait-btn-sm ait-btn-icon ait-btn-ghost" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="ait-preview-body">
          <iframe src={preview.url} title={preview.name} allow="clipboard-read; clipboard-write; fullscreen" referrerPolicy="no-referrer" />
        </div>
        <div className="ait-preview-note">
          如果页面空白或加载被拒绝，通常是该工具禁止被 iframe 嵌入，请点右上角「新标签页」。
        </div>
      </div>
    </div>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return <div className="ait-toast" data-kind={toast.kind || 'info'}>{toast.message}</div>
}

function EmptyState({ hasDirectories, hasFilters, onAdd, onClear }) {
  return (
    <div className="ait-empty">
      <div className="ait-empty-icon">🧰</div>
      <h3>{hasFilters ? '当前筛选下没有工具' : hasDirectories ? '这些目录里还没有扫描到项目' : '先添加一个项目目录'}</h3>
      <p>
        {hasFilters
          ? '换一个分类或搜索词试试，也可以清除筛选查看全部工具。'
          : hasDirectories
            ? '项目需要包含 README、package.json、pyproject.toml 或入口脚本。也可以直接添加一个可执行文件或本地网址。'
            : '选择一个你平时用 agent 开发 AI 工具的目录，插件会扫描其中的项目并自动识别启动方式。'}
      </p>
      {hasFilters ? (
        <button className="ait-btn ait-btn-primary" onClick={onClear}>显示全部工具</button>
      ) : (
        <button className="ait-btn ait-btn-primary" onClick={onAdd}>
          <Icon name="plus" size={15} /> 添加目录
        </button>
      )}
    </div>
  )
}

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [category, setCategory] = useState(CATEGORY_ALL)
  const [busy, setBusy] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [addMode, setAddMode] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message, kind = 'info') => {
    setToast({ message, kind })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const load = useCallback(async (quiet = false) => {
    try {
      const payload = await api('state')
      setData(payload.state)
      setLoadError('')
    } catch (error) {
      if (!quiet) setLoadError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 2500)
    return () => clearInterval(timer)
  }, [load])

  const act = useCallback(async (tool, path, extra = {}) => {
    setBusy({ id: tool.id, action: path })
    try {
      const payload = await api(path, { id: tool.id, ...extra })
      if (payload.state) setData(payload.state)
      return payload
    } catch (error) {
      showToast(error.message, 'error')
      return null
    } finally {
      setBusy(null)
    }
  }, [showToast])

  const handleStart = useCallback(async (tool) => {
    const payload = await act(tool, 'start')
    if (payload) showToast(`${tool.name} 已启动`)
  }, [act, showToast])

  const handleStop = useCallback(async (tool) => {
    const payload = await act(tool, 'stop')
    if (payload) showToast(`${tool.name} 已停止`)
  }, [act, showToast])

  const handleOpen = useCallback(async (tool) => {
    const payload = await act(tool, 'open')
    if (!payload) return
    if (payload.url) {
      setPreview({ url: payload.url, name: tool.name })
    } else if (payload.revealed) {
      showToast(payload.message || '已在文件管理器中显示')
    } else {
      showToast(payload.message || '已启动')
    }
  }, [act, showToast])

  const handleReveal = useCallback(async (tool) => {
    const payload = await act(tool, 'reveal')
    if (payload) showToast('已在文件管理器中显示')
  }, [act, showToast])

  const handleFavorite = useCallback(async (tool) => {
    const payload = await act(tool, 'favorite', { favorite: !tool.favorite })
    if (payload) showToast(tool.favorite ? '已取消收藏' : '已收藏，已置顶')
  }, [act, showToast])

  const handleRemove = useCallback(async (tool) => {
    const prompt = tool.origin === 'scan'
      ? `从列表移除「${tool.name}」？不会删除磁盘文件，重新扫描前它会保持隐藏。`
      : `从列表移除「${tool.name}」？不会删除磁盘文件。`
    if (!window.confirm(prompt)) return
    const payload = await act(tool, 'remove')
    if (payload) {
      setDetailId(null)
      showToast('已从列表移除')
    }
  }, [act, showToast])

  const handleRemoveDirectory = useCallback(async (directory) => {
    if (!window.confirm(`移除目录「${directory.label}」？不会删除磁盘文件，该目录下扫描出的项目会从列表消失。`)) return
    setBusy({ id: directory.id, action: 'remove-directory' })
    try {
      const payload = await api('remove-directory', { id: directory.id })
      if (payload.state) setData(payload.state)
      showToast('目录已移除')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setBusy(null)
    }
  }, [showToast])

  const handleRescan = useCallback(async () => {
    setBusy({ id: 'rescan', action: 'rescan' })
    try {
      const payload = await api('rescan', {})
      if (payload.state) setData(payload.state)
      showToast('已重新扫描目录')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setBusy(null)
    }
  }, [showToast])

  const tools = data?.tools ?? []
  const categories = useMemo(() => {
    const names = new Set(CATEGORY_OPTIONS)
    for (const tool of tools) names.add(tool.category || UNSORTED_CATEGORY)
    const extra = [...names].filter((item) => !CATEGORY_OPTIONS.includes(item)).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
    return [CATEGORY_ALL, ...CATEGORY_OPTIONS, ...extra]
  }, [tools])
  const categoryCounts = useMemo(() => {
    const counts = new Map([[CATEGORY_ALL, tools.length]])
    for (const tool of tools) {
      const name = tool.category || UNSORTED_CATEGORY
      counts.set(name, (counts.get(name) || 0) + 1)
    }
    return counts
  }, [tools])

  useEffect(() => {
    if (!categories.includes(category)) setCategory(CATEGORY_ALL)
  }, [categories, category])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const result = tools.filter((tool) => {
      if (category !== CATEGORY_ALL && (tool.category || UNSORTED_CATEGORY) !== category) return false
      if (filter === 'running' && !isLive(tool)) return false
      if (filter === 'stopped' && isLive(tool)) return false
      if (filter === 'web' && !tool.url) return false
      if (!needle) return true
      return [tool.name, tool.description, tool.path, tool.url, tool.launch?.label, ...(tool.tags ?? [])]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(needle))
    })
    return result.sort((left, right) => {
      const favoriteDelta = Number(Boolean(right.favorite)) - Number(Boolean(left.favorite))
      if (favoriteDelta !== 0) return favoriteDelta
      const leftRecent = Number(left.lastUsedAt) || Number(left.createdAt) || 0
      const rightRecent = Number(right.lastUsedAt) || Number(right.createdAt) || 0
      if (leftRecent !== rightRecent) return rightRecent - leftRecent
      const liveDelta = Number(isLive(right)) - Number(isLive(left))
      if (liveDelta !== 0) return liveDelta
      return left.name.localeCompare(right.name, 'zh-Hans-CN')
    })
  }, [tools, query, filter, category])

  const detail = detailId ? tools.find((tool) => tool.id === detailId) : null
  const editing = editingId ? tools.find((tool) => tool.id === editingId) : null
  const counts = data?.counts ?? { total: 0, running: 0 }
  const directories = data?.directories ?? []

  return (
    <div className="ait-page">
      <div className="ait-inner">
        <header className="ait-head">
          <div>
            <div className="ait-eyebrow">LOCAL AI TOOLBOX</div>
            <h1 className="ait-title">本地AI工具箱</h1>
            <p className="ait-subtitle">集中管理本地 agent 开发出来的工具：启动、停止、打开网页界面或应用，并查看每个项目的 README。</p>
          </div>
          <div className="ait-head-actions">
            <button className="ait-btn" onClick={() => void load()} title="重新读取状态">
              <Icon name="refresh" size={15} /> 刷新
            </button>
            <button className="ait-btn" onClick={handleRescan} disabled={busy?.id === 'rescan'}>
              {busy?.id === 'rescan' ? <span className="ait-spinner" /> : <Icon name="folder" size={15} />} 重新扫描
            </button>
            <button className="ait-btn" onClick={() => setAddMode('executable')}>
              <Icon name="plus" size={15} /> 添加工具
            </button>
            <button className="ait-btn ait-btn-primary" onClick={() => setAddMode('directory')}>
              <Icon name="plus" size={15} /> 添加目录
            </button>
          </div>
        </header>

        <div className="ait-stats">
          <div className="ait-stat"><b>{counts.total ?? tools.length}</b> 个工具</div>
          <div className="ait-stat"><b>{counts.running ?? 0}</b> 正在运行</div>
          <div className="ait-stat"><b>{directories.length}</b> 个项目目录</div>
          <div className="ait-stat"><b>{tools.filter((tool) => tool.kind === 'url' || tool.kind === 'app').length}</b> 个网址 / 应用</div>
        </div>

        <div className="ait-sort-note">⭐ 收藏置顶 · 最近使用优先 · 其余按名称排序</div>

        <div className="ait-categories" role="tablist" aria-label="工具分类">
          <span className="ait-cat-label">分类</span>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className="ait-cat"
              data-active={category === item}
              onClick={() => setCategory(item)}
              role="tab"
              aria-selected={category === item}
            >
              {item}
              <span className="ait-cat-count">{categoryCounts.get(item) || 0}</span>
            </button>
          ))}
        </div>

        <div className="ait-toolbar">
          <label className="ait-search">
            <Icon name="search" size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、说明、路径或端口…" aria-label="搜索工具" />
          </label>
          <div className="ait-filters" role="tablist" aria-label="筛选">
            {[['all', '全部'], ['running', '运行中'], ['stopped', '未运行'], ['web', '有网页']].map(([id, label]) => (
              <button key={id} className="ait-filter" data-active={filter === id} onClick={() => setFilter(id)} role="tab">{label}</button>
            ))}
          </div>
        </div>

        <div className="ait-dirs">
          {directories.map((directory) => (
            <span className="ait-dir" key={directory.id} title={directory.path}>
              <Icon name="folder" size={12} />
              <span className="ait-dir-label">{directory.label}</span>
              <button onClick={() => void handleRemoveDirectory(directory)} aria-label={`移除 ${directory.label}`} title="移除目录">
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
          <button className="ait-dir ait-dir-add" onClick={() => setAddMode('directory')}>
            <Icon name="plus" size={12} /> 目录
          </button>
        </div>

        {loading ? (
          <div className="ait-grid">
            {[0, 1, 2, 3].map((index) => (
              <div className="ait-card" key={index}>
                <div className="ait-skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
                <div className="ait-skeleton" style={{ width: '62%', height: 16 }} />
                <div className="ait-skeleton" style={{ width: '92%', height: 12 }} />
                <div className="ait-skeleton" style={{ width: '78%', height: 12 }} />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="ait-empty">
            <div className="ait-empty-icon">⚠️</div>
            <h3>无法读取工具列表</h3>
            <p>{loadError}</p>
            <button className="ait-btn" onClick={() => void load()}>重试</button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasDirectories={directories.length > 0}
            hasFilters={Boolean(query.trim()) || filter !== 'all' || category !== CATEGORY_ALL}
            onAdd={() => setAddMode('directory')}
            onClear={() => { setQuery(''); setFilter('all'); setCategory(CATEGORY_ALL) }}
          />
        ) : (
          <div className="ait-grid">
            {filtered.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                busy={busy}
                onStart={handleStart}
                onStop={handleStop}
                onOpen={handleOpen}
                onDetail={(selected) => setDetailId(selected.id)}
                onFavorite={handleFavorite}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, color: 'var(--ait-text-3)', fontSize: 11 }}>
          工具数据保存在 <span className="ait-mono">{data?.dataDir || '~/.dsh/ai-toolbox'}</span>，只记录路径和启动方式，不会复制项目文件。
        </div>
      </div>

      {detail ? (
        <DetailDrawer
          tool={detail}
          busy={busy}
          onClose={() => setDetailId(null)}
          onStart={handleStart}
          onStop={handleStop}
          onOpen={handleOpen}
          onReveal={handleReveal}
          onRemove={handleRemove}
          onEdit={(tool) => setEditingId(tool.id)}
          onFavorite={handleFavorite}
          showToast={showToast}
        />
      ) : null}

      {addMode ? (
        <AddDialog
          initialMode={addMode}
          onClose={() => setAddMode(null)}
          onDone={(state) => { if (state) setData(state); setAddMode(null) }}
          showToast={showToast}
        />
      ) : null}

      {editing ? (
        <EditDialog
          tool={editing}
          onClose={() => setEditingId(null)}
          onSaved={(payload) => { if (payload.state) setData(payload.state) }}
          showToast={showToast}
        />
      ) : null}

      {preview ? <PreviewModal preview={preview} onClose={() => setPreview(null)} /> : null}
      <Toast toast={toast} />
    </div>
  )
}

export const inject = ['slots']
export const name = 'ai-toolbox'

export function apply(ctx) {
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: 'ai-toolbox',
  }, App))

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: 'ai-toolbox',
    order: 20,
    label: '本地AI工具箱',
  }, SidebarIcon))
}