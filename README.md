# 太吾异世劫 Wiki · 玩家图鉴与 Build 工坊

一个非官方的《太吾异世劫》玩家资料站。整理功法、装备、角色特质、灵侍与局内道具，支持关键词反查、Build 配置、换装对比，以及 JSON / PNG 分享。

项目采用原生 HTML、CSS 和 JavaScript，无前端构建步骤、账号系统或后端依赖，可直接通过 GitHub Pages 发布。

## 功能

- **图鉴查询**：功法与升级分支、进化、装备固定词条和随机池、角色境界特质、灵侍成长阶段及局内道具。
- **关键词反查**：按名称或效果寻找相关功法、装备与特性、角色特质、灵侍和道具；卡片、精确关键词搜索与详情使用相同的相关记录。
- **Build 配置**：最多 6 门功法、每门最多 3 条升级分支、9 个装备部位，并选择角色、境界特质和随行灵侍。
- **装备对比**：按品阶汇总固定属性上下限，对照换装前后的属性差值与特殊效果变化。
- **可能联动**：随功法、进化及分支等级动态更新，默认折叠；用于配置规划，实际范围和叠加仍待验证。
- **保存与分享**：支持攻略备注、浏览器本地保存、JSON 导入导出；PNG 依次展示备注、角色与灵侍、功法、装备，不包含可能联动和详细属性合计。

## 数据范围与验证状态

当前收录基于 **2026-10-16 的已整理配置快照**，非全部游戏内容，适用游戏版本号尚未确认。

| 分类 | 收录范围 |
| --- | --- |
| 功法 | 30 门基础功法、450 个升级节点、90 个进化 |
| 装备与关键词 | 145 件装备、386 条装备特性、34 个关键词 |
| 角色特质 | 6 位角色、90 个特质 |
| 灵侍 | 7 类普通灵侍、43 条成长阶段、7 条特殊召唤、50 个技能槽记录 |
| 局内道具 | 8 种主动道具、35 种丹药、3 种基础拾取物 |

- **配置描述**：从游戏本地配置提取的说明。
- **待验证**：机制、触发范围或叠加方式尚未确认。
- **已实测机制**：需要提供游戏版本、测试日期、复现步骤与证据；当前尚无此类记录。

网页自动检查通过不代表游戏机制已实测。角色每境界最多选择 1 项特质属于当前规划规则；固定装备属性合计不包含随机词条、角色、灵侍或功法加成。

原安装目录在提取后出现过更新差异，本仓库保留此前已收集的数据快照，未自动替换为更新后的配置。数据日期、来源哈希和验证记录见 [verification.json](verification.json)。

## 本地运行

可直接打开根目录的 `index.html`。也可在仓库根目录使用 Python 3 启动本地静态服务：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

随后访问 <http://127.0.0.1:8000/>。浏览图鉴无需安装 Node.js、Python 依赖包或其他服务。

Build 保存在当前浏览器和网址的本地存储中。更换浏览器、设备或从本地迁移至公开网址前，请先导出 JSON，再在新网址导入。PNG 用于阅读分享，JSON 用于继续编辑。

## GitHub Pages 发布

1. 将本仓库内容推送至 GitHub，确保 `index.html` 位于仓库根目录。
2. 在仓库 **Settings → Pages** 中选择 **Deploy from a branch**。
3. 选择 **main** 分支和 **/(root)**，点击 **Save**。
4. 等待部署成功，在 Pages 页面点击 **Visit site**；可将网址填入仓库的 About / Website。

提交时保留 `.nojekyll`、`assets/`、所有运行时 JS/CSS 与数据文件。`data.js`、`guide-data.js` 和 `export-icons.js` 虽含生成内容，仍是网站运行与图片导出所需文件，需要提交。

详细步骤见 [发布与后续优化.md](发布与后续优化.md)，操作说明见 [使用说明.md](使用说明.md)。

## 开发与维护

主要文件：

| 文件 | 用途 |
| --- | --- |
| `index.html`、`wiki-ui.js`、`wiki-tools.css` | 主界面、关键词与联动展示 |
| `build-stats.js`、`wiki-tools.js`、`build-image.js` | 装备统计、关联逻辑、PNG 导出 |
| `guide-ui.js`、`guide-build.js`、`guide.css` | 角色、灵侍、道具与 Build 身份配置 |
| `data.js`、`guide-data.js`、`assets/icons/`、`export-icons.js` | 运行时数据、原图与导出缩略图 |
| `guide-source.json`、`source-links.json`、`mechanics-evidence.json` | 可维护数据源、原配置关联与验证记录 |

在仓库根目录使用 Node.js 运行检查：

```powershell
node check-build.cjs
node check-tools.cjs
node check-icons.cjs
node check-guide.cjs
```

修改 `guide-source.json` 后运行 `python prepare-guide-data.py`；更新图标后运行 `python prepare-export-icons.py`，后者需要 Pillow（`python -m pip install Pillow`）。编辑机制证据后运行 `node enrich-data.cjs`，再执行上述检查。以上生成步骤会更新对应的站点数据文件，请审阅后提交。

数据修正请保留记录 ID、来源、快照日期与验证状态，提交依据或复现步骤。具体要求见 [CONTRIBUTING.md](CONTRIBUTING.md)。欢迎通过 Issue 报告问题，或通过 Pull Request 提交改进。

## 忽略规则与个人文件

[.gitignore](.gitignore) 已排除依赖环境、缓存、编辑器配置、临时文件、压缩包及本地工作记录。个人 Build JSON、导出 PNG 等请放入 `private/`、`local-builds/` 或 `build-exports/`，这些目录不会被 Git 默认加入；公共示例与测试 JSON、图鉴图片和数据仍保留版本控制。

忽略规则不会自动移除此前已被 Git 跟踪的文件，提交前请检查暂存区。

## 许可证与游戏素材

本项目的**原创前端代码、维护脚本及原创文档采用 [MIT License](LICENSE)**，便于社区继续维护。许可证文本参考 [Open Source Initiative 的 MIT 文本](https://opensource.org/license/mit)。

**游戏图标、游戏文本、从原配置提取的数据及其派生素材不属于本项目 MIT 授权范围**。这包括 `assets/icons/` 中的游戏图标、`export-icons.js` 内嵌的图标，以及各数据文件中来源于游戏的内容；即使这些内容与代码存放在同一文件中，其权利归属仍保留给原权利方。

本项目为非官方玩家工具，未声明获得游戏官方授权。代码开源不代表授予游戏素材的额外使用、再分发或商业授权；请在后续维护与分发时保留来源说明。
