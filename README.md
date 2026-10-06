# 草原牌桌

完全离线的 Android 扑克游戏，当前交付版本 **0.8-final**。支持打大A（5人）、打对家（4人，对面两人同队）和争上游（2/3人），内置机器人和出牌提示。

- APK没有网络权限；资源、规则和策略全部内置。
- 机器人通过本地 Web Worker 进行未知手牌抽样与对局模拟，只使用己方手牌和公开信息。
- 支持发牌中亮A、反A、明暗独打、独立取牌按钮、自动最近队友接风。
- 我方出牌不限时；累计积分、对局存档与继续上局；大字体与横屏界面。

正式 APK 位于本仓库 [Releases](https://github.com/JOKER1868/grassland-poker/releases)，包名 `com.grassland.doudizhubase`。iOS 版本暂未制作。

## 构建 Android APK

使用 Windows PowerShell、Node.js、JDK 17 和 Android SDK（platforms/android-35、build-tools/35.0.0）。无需安装 Cocos Creator 即可用仓库现有网页资源构建 Android 容器。

```powershell
./android-shell/build.ps1 -Release `
  -Jdk 'D:\path\to\jdk-17' `
  -Sdk 'D:\path\to\android-sdk' `
  -Node 'D:\path\to\node.exe' `
  -KeyStore 'D:\private\grassland-development.p12'
```

输出 `android-shell/dist/grassland-0.8.apk`。脚本从上游 `dist/web-mobile` 准备资源，并加入可编辑的本地规则与界面模块；省略 `-Release` 会生成开发调试包。签名文件不在仓库内。签名路径不存在时会生成本地开发密钥（别名 `grassland`，开发密码 `android`）；保留同一密钥才能覆盖安装自己的旧版本。

修改场景或预制体时需另用对应版本的 Creator 导出网页。仓库 `project.json` 为 2.4.13，已有网页运行时为 2.3.0；这里的构建流程没有重新编译 Creator 场景。

## 代码与验证

| 路径 | 内容 |
| --- | --- |
| `assets/scripts/grassland/grasslandCore.js` | 牌型、对局、结算与机器人搜索 |
| `assets/scripts/grassland/grasslandAdapter.js` | 前端接入、操作、字体、存档与累计分 |
| `assets/scripts/grassland/grasslandWorker.js` | 离线策略计算 |
| `android-shell/` | Android 容器及构建脚本 |
| `verification/` | 回归脚本与结果 |
| [MIGRATION.md](MIGRATION.md) | 来源、实现、交付与已知差异 |

```powershell
node verification/check-declaration.cjs
node verification/check-settlement-wind.cjs
node verification/check-grassland.cjs
```

最近交付通过80局引擎对局、480个结算场景、9个接风场景、7个王组合比较场景，以及四种人数配置的界面对局检查。浏览器布局验证使用 Python Playwright 与已安装的 Edge，详见 `verification/check-readable-ui.py`。这些测试不代表机器人已达到商业版本的实力；机器人不会在使用过程中自动学习。

## 来源与授权

本项目保留上游历史与原前端资源，基于 [VYuLinLin/doudizhu-stand-alone](https://github.com/VYuLinLin/doudizhu-stand-alone) 修改。原前端来自 [tinyshu/ddz_game](https://github.com/tinyshu/ddz_game)，原算法来源为 [liyl1991/landlord](https://github.com/liyl1991/landlord)。上游说明保存在 [UPSTREAM-README.md](UPSTREAM-README.md)。

尚未发现上述仓库的项目级 LICENSE，不擅自为其资源或原代码添加新的开源授权。本仓库用于个人开发与备份，保留原作者与来源信息。
