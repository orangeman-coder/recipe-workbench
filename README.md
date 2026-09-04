# 拍菜谱工作台

拍下食材照片，自动识别食材、结合约束条件，基于内置菜谱库 + 大模型生成能照着做的菜谱。

## 功能
- 五节点流水线：图片预处理与质检 → 多模态食材识别 → 用户确认与约束 → 菜谱检索与生成 → 输出与反馈
- 内置 98 道家常菜谱（含 ima 订阅知识库选题同步 57 道），支持 JSON 导入扩充
- 大模型由用户自行配置（OpenAI 兼容接口，含服务商预设、模型下拉选择、双模型连接测试）
- ima 知识库登录同步（个人库可同步原文，订阅库受平台保护仅支持检索标题）
- 全链路安全加固：XSS 转义、Prompt 注入防护（数据区分界）、导入字段白名单、https 校验
- 忌口/过敏双重防线（Prompt 最高优先级 + 输出扫描拦截）

## 文件说明
| 文件 | 说明 |
|------|------|
| index.html | 工作台前端（单文件，零依赖） |
| api/proxy.js | Vercel Serverless 代理（部署后手机直接用，无 CORS） |
| server.js | 本地开发代理（node server.js → http://127.0.0.1:8787） |
| sync_ima.js | ima 知识库本地代理同步脚本（list / pull / parse） |
| DEPLOY.md | Vercel 部署指南 |

## 快速开始
- 本地：`node server.js` 后访问 http://127.0.0.1:8787/ （也可直接双击 index.html，但模型调用受浏览器 CORS 限制）
- 线上：部署到 Vercel（见 DEPLOY.md），自带 /api 代理

## 模型配置（以硅基流动为例）
- Base URL：`https://api.siliconflow.cn/v1`
- 视觉模型：`Qwen/Qwen3-VL-32B-Instruct`（识别食材）
- 文本模型：`deepseek-ai/DeepSeek-V3.1`（生成菜谱）
