## 项目说明

本仓库为 [sansan0/TrendRadar](https://github.com/sansan0/TrendRadar) 的衍生修改版本。

- 原项目协议：GPL-3.0
- 修改范围：前端页面调整，以及配套的数据导出、关键词分组和构建流程适配

本项目延续使用 GPL-3.0 协议分发，详细许可条款见仓库内 [LICENSE](LICENSE) 文件。

## 本仓库使用

当前基于上游 **TrendRadar 6.11.0**，保留本仓库的 React 页面、主题切换、相似新闻折叠、目录导航、截图保存和自定义域名。

- Python 3.12+，使用 `uv sync --frozen --no-dev` 安装后端依赖。
- Node.js 24，使用 `npm --prefix frontend ci` 安装前端依赖。
- 运行 `uv run python -m trendradar` 采集新闻，生成根目录 `data.json` 和 `output/` 下的原生报告。
- 运行 `npm --prefix frontend run build` 构建页面，将 `frontend/dist/` 内的文件复制到仓库根目录后，用 `uv run python -m http.server 8000 --bind 127.0.0.1` 预览。
- GitHub Actions 每小时采集一次，保存当日 SQLite 数据并自动更新根目录页面产物；域名仍由 `CNAME` 管理。

平台、关键词和日报模式沿用本仓库配置；新增的 RSS、AI 分析和 AI 翻译默认关闭，可在 `config/config.yaml` 中按需启用。当前定制页面展示热榜数据，RSS / AI 的完整内容可在 `output/index.html` 原生报告中查看。

上游功能与部署文档见 [sansan0/TrendRadar](https://github.com/sansan0/TrendRadar)。本仓库的迁移记录、测试命令和后续更新步骤见 [上游同步说明](docs/UPSTREAM_SYNC.md)。
