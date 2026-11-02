/* dsh-ai-toolbox — plugin-owned styles, injected once by the client bundle. */

export const STYLES = String.raw`

.ait-page {
  --ait-bg: var(--dsw-alias-bg-base, #ffffff);
  --ait-card: var(--dsw-alias-bg-layer-1, #ffffff);
  --ait-card-strong: var(--dsw-alias-bg-layer-2, #f7f7f8);
  --ait-fill: var(--dsw-alias-bg-layer-3, #f0f0f2);
  --ait-border: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.10));
  --ait-border-strong: var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.16));
  --ait-text: var(--dsw-alias-label-primary, #17181c);
  --ait-text-2: var(--dsw-alias-label-secondary, #5b5e66);
  --ait-text-3: var(--dsw-alias-label-tertiary, #8b8e96);
  --ait-accent: var(--dsw-alias-state-business-primary, #4176e6);
  --ait-accent-soft: color-mix(in srgb, var(--ait-accent) 12%, transparent);
  --ait-green: var(--dsw-alias-state-success-primary, #1c9b62);
  --ait-green-soft: color-mix(in srgb, var(--ait-green) 13%, transparent);
  --ait-amber: var(--dsw-alias-state-warn-primary, #c18416);
  --ait-amber-soft: color-mix(in srgb, var(--ait-amber) 14%, transparent);
  --ait-red: var(--dsw-alias-state-error-primary, #d14343);
  --ait-red-soft: color-mix(in srgb, var(--ait-red) 12%, transparent);
  --ait-radius: 15px;
  color: var(--ait-text);
  background: var(--ait-bg);
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  padding: 30px clamp(18px, 4vw, 52px) 72px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.ait-page *,
.ait-page *::before,
.ait-page *::after { box-sizing: border-box; }

.ait-inner { width: 100%; max-width: 1160px; margin: 0 auto; }

.ait-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.ait-eyebrow { color: var(--ait-accent); font-size: 11px; font-weight: 700; letter-spacing: 0.13em; margin-bottom: 6px; }
.ait-title { margin: 0; font-size: 28px; font-weight: 680; letter-spacing: -0.025em; line-height: 1.15; }
.ait-subtitle { margin: 9px 0 0; color: var(--ait-text-2); font-size: 13.5px; max-width: 620px; }
.ait-head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

.ait-btn {
  appearance: none;
  border: 0.5px solid var(--ait-border-strong);
  background: var(--ait-card);
  color: var(--ait-text);
  border-radius: 10px;
  min-height: 34px;
  padding: 7px 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms ease, border-color 120ms ease, transform 120ms ease, opacity 120ms ease;
}
.ait-btn:hover:not(:disabled) { background: var(--ait-card-strong); border-color: var(--ait-border-strong); }
.ait-btn:active:not(:disabled) { transform: translateY(1px); }
.ait-btn:disabled { cursor: default; opacity: 0.48; }
.ait-btn-primary { background: var(--ait-accent); border-color: transparent; color: #fff; }
.ait-btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--ait-accent) 88%, #000); border-color: transparent; }
.ait-btn-danger { color: var(--ait-red); }
.ait-btn-ghost { border-color: transparent; background: transparent; color: var(--ait-text-2); }
.ait-btn-ghost:hover:not(:disabled) { background: var(--ait-fill); color: var(--ait-text); }
.ait-btn-sm { min-height: 29px; padding: 5px 9px; font-size: 12px; border-radius: 8px; }
.ait-btn-icon { width: 34px; padding: 0; }
.ait-btn-icon.ait-btn-sm { width: 29px; }

.ait-stats { display: flex; gap: 10px; flex-wrap: wrap; margin: 24px 0 18px; }
.ait-stat {
  display: flex; align-items: baseline; gap: 6px;
  padding: 8px 12px; border-radius: 10px;
  background: var(--ait-card); border: 0.5px solid var(--ait-border);
  color: var(--ait-text-2); font-size: 12px;
}
.ait-stat b { color: var(--ait-text); font-size: 16px; font-weight: 650; font-variant-numeric: tabular-nums; }

.ait-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: space-between; margin-bottom: 12px; }
.ait-search { position: relative; flex: 1 1 240px; max-width: 360px; }
.ait-search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--ait-text-3); pointer-events: none; }
.ait-search input {
  width: 100%; height: 36px; padding: 0 12px 0 34px;
  border: 0.5px solid var(--ait-border-strong); border-radius: 10px;
  background: var(--ait-card); color: var(--ait-text);
  font: inherit; font-size: 13px; outline: none;
}
.ait-search input::placeholder { color: var(--ait-text-3); }
.ait-search input:focus { border-color: var(--ait-accent); box-shadow: 0 0 0 2px var(--ait-accent-soft); }
.ait-categories { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.ait-cat-label { color: var(--ait-text-3); font-size: 11px; margin-right: 1px; }
.ait-cat {
  appearance: none; display: inline-flex; align-items: center; gap: 5px;
  border: 0.5px solid var(--ait-border); background: var(--ait-card); color: var(--ait-text-2);
  border-radius: 999px; min-height: 29px; padding: 4px 11px; font: inherit; font-size: 12px; cursor: pointer;
}
.ait-cat:hover { border-color: var(--ait-border-strong); color: var(--ait-text); }
.ait-cat[data-active="true"] { background: var(--ait-accent-soft); border-color: transparent; color: var(--ait-accent); font-weight: 600; }
.ait-cat-count { font-size: 10px; opacity: 0.62; }
.ait-filters { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--ait-fill); gap: 2px; }
.ait-filter {
  appearance: none; border: 0; background: transparent; color: var(--ait-text-2);
  border-radius: 8px; min-height: 28px; padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer;
}
.ait-filter[data-active="true"] { background: var(--ait-card); color: var(--ait-text); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

.ait-dirs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 22px; }
.ait-dir {
  display: inline-flex; align-items: center; gap: 6px; max-width: 300px;
  min-height: 27px; padding: 4px 5px 4px 10px; border-radius: 999px;
  background: var(--ait-card); border: 0.5px solid var(--ait-border);
  color: var(--ait-text-2); font-size: 11.5px;
}
.ait-dir-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-dir button {
  appearance: none; border: 0; background: transparent; color: var(--ait-text-3);
  width: 19px; height: 19px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0;
}
.ait-dir button:hover { background: var(--ait-red-soft); color: var(--ait-red); }
.ait-dir-add { border-style: dashed; color: var(--ait-text-2); padding: 4px 10px; cursor: pointer; background: transparent; }
.ait-dir-add:hover { border-color: var(--ait-accent); color: var(--ait-accent); }

.ait-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(292px, 1fr)); gap: 12px; }
.ait-card {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  min-width: 0; padding: 16px;
  background: var(--ait-card); border: 0.5px solid var(--ait-border);
  border-radius: var(--ait-radius);
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}
.ait-card:hover { border-color: var(--ait-border-strong); box-shadow: 0 8px 24px rgba(0,0,0,0.07); transform: translateY(-1px); }
.ait-card[data-status="running"] { border-color: color-mix(in srgb, var(--ait-green) 34%, var(--ait-border)); }
.ait-card[data-status="starting"] { border-color: color-mix(in srgb, var(--ait-amber) 34%, var(--ait-border)); }
.ait-card[data-status="error"] { border-color: color-mix(in srgb, var(--ait-red) 32%, var(--ait-border)); }

.ait-card-top { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.ait-icon {
  width: 40px; height: 40px; flex: none; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--ait-accent-soft); color: var(--ait-accent);
  font-size: 20px;
}
.ait-icon[data-kind="url"] { background: var(--ait-green-soft); color: var(--ait-green); }
.ait-icon[data-kind="app"] { background: var(--ait-amber-soft); color: var(--ait-amber); }
.ait-icon[data-kind="executable"] { background: var(--ait-fill); color: var(--ait-text-2); }
.ait-card-heading { min-width: 0; flex: 1; }
.ait-card-name { margin: 0; font-size: 15px; font-weight: 650; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.ait-badge {
  display: inline-flex; align-items: center; height: 19px; padding: 0 6px; border-radius: 5px;
  background: var(--ait-fill); color: var(--ait-text-2); font-size: 10.5px; font-weight: 520;
}
.ait-badge-kind { background: var(--ait-accent-soft); color: var(--ait-accent); }
.ait-badge-category { background: var(--ait-amber-soft); color: var(--ait-amber); }

.ait-star[data-active="true"] { color: var(--ait-amber); }
.ait-star:hover { color: var(--ait-amber); }
.ait-sort-note { margin: -6px 0 14px; color: var(--ait-text-3); font-size: 11px; }
.ait-status { display: inline-flex; align-items: center; gap: 5px; flex: none; font-size: 11px; color: var(--ait-text-2); padding-top: 3px; }
.ait-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ait-text-3); flex: none; }
.ait-status[data-status="running"] .ait-dot { background: var(--ait-green); box-shadow: 0 0 0 3px var(--ait-green-soft); }
.ait-status[data-status="starting"] .ait-dot,
.ait-status[data-status="stopping"] .ait-dot { background: var(--ait-amber); animation: ait-pulse 1s ease-in-out infinite; }
.ait-status[data-status="error"] .ait-dot { background: var(--ait-red); }
.ait-status[data-status="opened"] .ait-dot,
.ait-status[data-status="external"] .ait-dot { background: var(--ait-accent); }

.ait-desc { margin: 0; color: var(--ait-text-2); font-size: 12.5px; line-height: 1.55; min-height: 38px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ait-path { color: var(--ait-text-3); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-run-line { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--ait-text-3); font-size: 11px; }
.ait-run-line code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10.5px; background: var(--ait-fill); border-radius: 5px; padding: 2px 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-run-line a { color: var(--ait-accent); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-run-line a:hover { text-decoration: underline; }
.ait-card-actions { display: flex; align-items: center; gap: 6px; margin-top: auto; padding-top: 3px; flex-wrap: wrap; }
.ait-card-actions .ait-spacer { flex: 1; }

.ait-empty { padding: 72px 20px; text-align: center; border: 1px dashed var(--ait-border-strong); border-radius: 20px; color: var(--ait-text-2); background: var(--ait-card); }
.ait-empty-icon { font-size: 40px; margin-bottom: 10px; }
.ait-empty h3 { margin: 0 0 6px; color: var(--ait-text); font-size: 16px; }
.ait-empty p { margin: 0 auto 16px; max-width: 440px; font-size: 13px; }

.ait-spinner { width: 12px; height: 12px; border: 1.6px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: ait-spin 0.7s linear infinite; flex: none; }
@keyframes ait-spin { to { transform: rotate(360deg); } }
@keyframes ait-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.38; } }

.ait-toast {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
  z-index: 5000; max-width: min(560px, 90vw);
  padding: 10px 14px; border-radius: 10px;
  background: var(--dsw-alias-toast-bg, #222); color: var(--dsw-alias-toast-label, #fff);
  box-shadow: 0 10px 30px rgba(0,0,0,0.24); font-size: 12.5px;
  animation: ait-toast-in 160ms ease-out;
}
.ait-toast[data-kind="error"] { background: var(--ait-red); color: #fff; }
@keyframes ait-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } }

.ait-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(0,0,0,0.30); }
.ait-drawer-backdrop { display: flex; justify-content: flex-end; }
.ait-drawer {
  width: min(660px, 95vw); height: 100%; display: flex; flex-direction: column;
  background: var(--ait-bg); color: var(--ait-text);
  box-shadow: -20px 0 60px rgba(0,0,0,0.25);
  animation: ait-slide-in 180ms ease-out;
}
@keyframes ait-slide-in { from { transform: translateX(24px); opacity: 0.6; } }
.ait-drawer-head { display: flex; align-items: flex-start; gap: 12px; padding: 20px 20px 14px; border-bottom: 0.5px solid var(--ait-border); }
.ait-drawer-title { margin: 0; font-size: 19px; font-weight: 660; line-height: 1.25; }
.ait-drawer-sub { color: var(--ait-text-2); font-size: 11.5px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-tabs { display: flex; gap: 2px; padding: 8px 14px 0; border-bottom: 0.5px solid var(--ait-border); }
.ait-tab { appearance: none; border: 0; background: transparent; color: var(--ait-text-2); font: inherit; font-size: 12.5px; padding: 9px 10px; cursor: pointer; border-bottom: 2px solid transparent; }
.ait-tab[data-active="true"] { color: var(--ait-text); border-bottom-color: var(--ait-accent); }
.ait-drawer-body { flex: 1; overflow: auto; padding: 18px 20px 40px; }

.ait-kv { display: grid; grid-template-columns: 92px 1fr; gap: 8px 12px; font-size: 12.5px; align-items: start; }
.ait-kv dt { color: var(--ait-text-3); }
.ait-kv dd { margin: 0; color: var(--ait-text); min-width: 0; word-break: break-all; }
.ait-kv code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; background: var(--ait-fill); padding: 2px 5px; border-radius: 5px; }
.ait-detail-actions { display: flex; gap: 7px; flex-wrap: wrap; margin: 2px 0 20px; }
.ait-section-title { font-size: 12px; font-weight: 650; color: var(--ait-text); margin: 22px 0 9px; display: flex; align-items: center; gap: 7px; }
.ait-section-title::after { content: ""; height: 1px; flex: 1; background: var(--ait-border); }
.ait-tags { display: flex; gap: 5px; flex-wrap: wrap; }

.ait-md { font-size: 13.5px; line-height: 1.72; color: var(--ait-text); overflow-wrap: anywhere; }
.ait-md > :first-child { margin-top: 0; }
.ait-md h1, .ait-md h2, .ait-md h3, .ait-md h4, .ait-md h5, .ait-md h6 { line-height: 1.3; margin: 1.45em 0 0.55em; font-weight: 660; letter-spacing: -0.012em; }
.ait-md h1 { font-size: 1.55em; }
.ait-md h2 { font-size: 1.3em; padding-bottom: 0.3em; border-bottom: 0.5px solid var(--ait-border); }
.ait-md h3 { font-size: 1.12em; }
.ait-md h4, .ait-md h5, .ait-md h6 { font-size: 1em; }
.ait-md p { margin: 0.7em 0; }
.ait-md a { color: var(--ait-accent); text-decoration: none; }
.ait-md a:hover { text-decoration: underline; }
.ait-md code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.88em; background: var(--ait-fill); padding: 0.14em 0.38em; border-radius: 4px; }
.ait-md pre { margin: 0.9em 0; padding: 12px 13px; border-radius: 10px; overflow: auto; background: var(--ait-card-strong); border: 0.5px solid var(--ait-border); }
.ait-md pre code { background: transparent; padding: 0; font-size: 11.5px; line-height: 1.55; }
.ait-md blockquote { margin: 0.9em 0; padding: 0.1em 0 0.1em 13px; border-left: 3px solid var(--ait-border-strong); color: var(--ait-text-2); }
.ait-md ul, .ait-md ol { margin: 0.6em 0; padding-left: 1.5em; }
.ait-md li { margin: 0.24em 0; }
.ait-md hr { border: 0; border-top: 0.5px solid var(--ait-border); margin: 1.4em 0; }
.ait-md table { width: 100%; border-collapse: collapse; margin: 0.9em 0; font-size: 12px; }
.ait-md th, .ait-md td { border: 0.5px solid var(--ait-border); padding: 6px 8px; text-align: left; vertical-align: top; }
.ait-md th { background: var(--ait-card-strong); font-weight: 620; }
.ait-md img, .ait-md-image { max-width: 100%; }
.ait-md-image { color: var(--ait-text-3); font-size: 11px; }
.ait-md input[type="checkbox"] { margin-right: 5px; }

.ait-logs {
  margin: 0; padding: 12px; min-height: 220px; max-height: calc(100vh - 260px);
  overflow: auto; white-space: pre-wrap; word-break: break-word;
  background: #111318; color: #d7dae0; border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1.55;
}
.ait-log-empty { color: var(--ait-text-3); font-size: 12px; padding: 20px 0; }

.ait-modal-backdrop { display: flex; align-items: center; justify-content: center; padding: 24px; }
.ait-modal {
  width: min(540px, 94vw); max-height: 88vh; overflow: auto;
  background: var(--ait-bg); color: var(--ait-text); border-radius: 18px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.30); padding: 22px;
  animation: ait-modal-in 160ms ease-out;
}
@keyframes ait-modal-in { from { transform: translateY(8px) scale(0.985); opacity: 0.7; } }
.ait-modal h2 { margin: 0 0 4px; font-size: 19px; font-weight: 660; }
.ait-modal .ait-muted { color: var(--ait-text-2); font-size: 12px; margin: 0 0 16px; }
.ait-segment { display: inline-flex; gap: 2px; padding: 3px; border-radius: 9px; background: var(--ait-fill); margin-bottom: 16px; }
.ait-segment button { appearance: none; border: 0; background: transparent; color: var(--ait-text-2); border-radius: 7px; padding: 6px 11px; font: inherit; font-size: 12px; cursor: pointer; }
.ait-segment button[data-active="true"] { background: var(--ait-card); color: var(--ait-text); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

.ait-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.ait-field label { font-size: 11.5px; color: var(--ait-text-2); font-weight: 550; }
.ait-field input, .ait-field textarea {
  width: 100%; border: 0.5px solid var(--ait-border-strong); border-radius: 9px;
  background: var(--ait-card); color: var(--ait-text); font: inherit; font-size: 13px;
  padding: 9px 10px; outline: none; resize: vertical;
}
.ait-field input:focus, .ait-field textarea:focus { border-color: var(--ait-accent); box-shadow: 0 0 0 2px var(--ait-accent-soft); }
.ait-field-hint { color: var(--ait-text-3); font-size: 10.5px; }
.ait-form-actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 18px; }
.ait-form-actions .ait-spacer { flex: 1; }
.ait-form-error { color: var(--ait-red); font-size: 12px; margin-top: 8px; }
.ait-edit-modal { width: min(600px, 94vw); }
.ait-edit-path {
  display: block; padding: 8px 10px; border-radius: 8px; background: var(--ait-fill);
  color: var(--ait-text-2); font-size: 11px; overflow-wrap: anywhere;
}

.ait-preview-modal {
  width: min(1240px, 96vw); height: min(880px, 90vh); display: flex; flex-direction: column;
  background: var(--ait-bg); border-radius: 16px; overflow: hidden;
  box-shadow: 0 30px 100px rgba(0,0,0,0.36); animation: ait-modal-in 160ms ease-out;
}
.ait-preview-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 0.5px solid var(--ait-border); flex: none; }
.ait-preview-title { font-size: 13px; font-weight: 620; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-preview-url { color: var(--ait-text-3); font-size: 10.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ait-preview-body { flex: 1; min-height: 0; background: #fff; }
.ait-preview-body iframe { width: 100%; height: 100%; border: 0; display: block; }
.ait-preview-note { padding: 6px 12px; color: var(--ait-text-3); background: var(--ait-card); font-size: 10.5px; border-top: 0.5px solid var(--ait-border); }

.ait-skeleton { border-radius: 8px; background: linear-gradient(90deg, var(--ait-fill) 25%, var(--ait-card-strong) 37%, var(--ait-fill) 63%); background-size: 400% 100%; animation: ait-shimmer 1.3s ease infinite; }
@keyframes ait-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

.ait-muted { color: var(--ait-text-2); }
.ait-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

@media (max-width: 780px) {
  .ait-page { padding: 20px 14px 56px; }
  .ait-head { flex-direction: column; gap: 14px; }
  .ait-head-actions { justify-content: flex-start; }
  .ait-title { font-size: 23px; }
  .ait-grid { grid-template-columns: 1fr; }
  .ait-toolbar { align-items: stretch; }
  .ait-search { max-width: none; }
  .ait-drawer { width: 100vw; }
}`
