# 上游同步与本仓库定制

## 本次迁移

- 迁移日期：2026-11-10。
- 上游：sansan0/TrendRadar，master，提交 8a316628215c53ad34b7200ecb0fba76de3ef6c7（6.11.0）。
- origin 指向 13LSR/TrendRadar，upstream 指向 sansan0/TrendRadar。
- backup/pre-upgrade-local-20261110 保存迁移前的本地代码及来源声明。
- backup/pre-upstream-20261110 还包含迁移前已同步的远程 main 和全部旧新闻产物。
- 升级分支：codex/upgrade-trendradar-6.11。
- backup/pre-push-cleanup-20261110 保存推送保护处理前的完整本地历史，仅作为本地备份。
- codex/upstream-clean 是清理文档示例后的上游基线，可在后续同步时重新生成。

原仓库重新初始化过 Git，没有与上游共享祖先。本次从上游创建升级分支，以保留双方父提交的合并接入旧仓库，再迁移定制代码。已发布的本仓库提交保持原样。GitHub 推送保护拦截了上游历史 README 及配置注释中的 Slack Webhook 示例，因此未发布的导入历史通过 `scripts/sanitize_upstream.py` 将示例替换为占位符；作者、日期、提交消息和合并拓扑保留，重写提交上的旧签名移除。后续先生成清理后的上游分支，再正常合并，无需再次使用 --allow-unrelated-histories。

## 保留与适配

| 原有内容 | 升级后的处理 |
| --- | --- |
| frontend/ 内的 React 页面 | 保留组件、样式和交互，继续使用锁定的依赖版本 |
| main.py 内的 data.json 导出 | 移至 trendradar/report/frontend.py，通过新版报表入口调用 |
| 根目录 index.html | 由前端构建维护，采集只刷新 JSON，不覆盖自定义页面 |
| 原生 HTML 报告 | 保存在 output/index.html 及 output/html/ 下 |
| 20 个平台、25 个词组 | 保留平台、词条、过滤词和组名，改用上游原生 [组名] 语法 |
| 每日汇总、每小时采集 | 保留，改用 Python 3.12、uv.lock 和 python -m trendradar |
| CNAME 自定义域名 | 保留 news.331106.xyz |
| 历史 output/ 和最新 data.json | 原样保留，不用上游示例数据覆盖 |

report.frontend_data_path: "data.json" 启用前端导出；设为空字符串则恢复上游覆盖根目录 HTML 的行为。该设置依赖 storage.formats.html: true。前端仍展示热榜分组；RSS、AI 分析与翻译可按需启用，原生报告承载其完整内容。

旧版 TXT/HTML 历史文件仍可直接查看。新版使用 output/news/YYYY-MM-DD.db 累计每日数据；旧 TXT 未批量导入 SQLite，因此新版统计和 MCP 从升级后的采集记录开始。Actions 会提交 SQLite 文件，确保每次任务之间能延续当日数据。

本仓库继续采用原有的每小时长期采集流程，不使用上游七天签到流程。上游的 Issue Guard 仅在原作者仓库启用。通知凭据继续从 GitHub Secrets 读取。

## 本地验证

需要 Python 3.12+、uv、Node.js 24。

~~~bash
uv sync --frozen --no-dev
uv run --frozen --with pytest python -m pytest tests -q
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
~~~

构建完成后，将 frontend/dist/ 的内容复制到仓库根目录；不要将旧 data.json 放进 frontend/public/，以免构建覆盖最新采集数据。启动根目录静态服务，检查日报、主题、折叠、目录和截图按钮。

### 页面排版与模块导出

前端保留终端风格、琥珀/青色配色和新闻聚合规则，中文使用无衬线回退字体。桌面使用左侧固定目录与右侧新闻列表，窄屏使用单列布局、常驻当前模块目录与目录面板。样式集中在 `frontend/src/report.css`，新闻条目由 `NewsItem.jsx` 共享。

启动动画采用带实时时间戳的逐行终端日志、闪烁光标与进度条，自动播放约 3 秒，仅在同一浏览器首次访问时出现，可立即跳过；开启系统“减少动态效果”时直接进入新闻。首次访问记录与主题分别保存在 `trendradar-intro-v1` 和 `trendradar-theme-v2`，存储受限时降级使用会话存储；清除站点数据后会再次出现。深浅主题在首屏绘制前应用。加载失败可直接重试。

“保存图片”打开模块多选面板，短屏自动固定在可视区域，模块列表独立滚动，下载操作保持可达。导出包含所选模块的全部原始新闻来源，不受页面折叠状态影响。每张图片固定 1800 像素宽，较长模块按完整新闻条目分页；单张直接下载 PNG，多张打包为 ZIP。导出区域不包含侧边目录和页面左右留白，手机端也使用相同输出分辨率。

`ExportMenu.jsx` 管理选择和下载，`exportModules.js` 管理分页与 ZIP，`exportImage.js` 负责支持现代 CSS 颜色的截图与尺寸限制。单元测试覆盖尺寸、分页完整性、文件命名与 ZIP 内容。运行 Vite 后可访问 `/tests/export-image.html` 验证现代颜色渲染；还应使用真实日报检查多模块分页、手机端单模块导出及 PNG 实际尺寸。

运行 uv run python -m trendradar 会按配置采集并可能推送通知。本地只验证采集时，应先使用单独的配置文件关闭 notification.enabled；通过 CONFIG_PATH 指向该配置。不要把通知密钥写入提交。

## 后续同步

先提交自己的代码，确保 git status 干净，再执行以下步骤。分支名称中的日期需替换为本次更新日期。

~~~bash
git switch main
git pull --ff-only origin main
git branch backup/before-upstream-YYYYMMDD
git fetch upstream
python scripts/sanitize_upstream.py upstream/master codex/upstream-clean
git switch -c codex/update-upstream-YYYYMMDD
git merge codex/upstream-clean
~~~

清理脚本扫描历史文件，将内嵌 Slack Webhook URL 替换为占位符，使用 Python 标准库与 Git，不修改源引用或工作目录。对同一上游版本重复运行会生成相同的提交。不要直接合并原始 upstream/master，否则会重新引入 GitHub 已拦截的历史示例；备份分支也应仅保留在本地，推送时明确指定 main。

若有冲突，重点检查 config/config.yaml、config/frequency_words.txt、.github/workflows/crawler.yml、trendradar/context.py、trendradar/core/loader.py 和 trendradar/report/generator.py。配置要保留本仓库的平台、词组和 frontend_data_path，同时吸收新版字段。首页冲突应重新构建 React 页面。

运行上面的验证命令后，提交冲突解决与适配结果，再合入 main：

~~~bash
git switch main
git merge --ff-only codex/update-upstream-YYYYMMDD
~~~

确认需要更新远程后再执行 git push origin main。若期间自动采集产生新提交，先获取并合并 origin/main，处理数据产物冲突后再推送；不要强推。

## 回退

查看旧版可使用 git switch backup/pre-upstream-20261110。它包含本次迁移前的完整代码和产物。已公开的 main 不应通过强制重置改写历史；如需回退部署，应基于备份创建可审查的恢复提交。
