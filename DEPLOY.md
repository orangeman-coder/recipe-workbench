# 拍菜谱工作台 — Vercel 部署指南

## 部署包内容
- `index.html` — 工作台前端（含 98 道内置菜谱）
- `api/proxy.js` — Vercel Serverless 代理（部署后所有模型 / ima 请求经 `/api/proxy` 转发，手机浏览器直接可用，无 CORS 限制）

## 部署方式 A：网页拖拽（最简单，推荐）
1. 解压 `recipe-workbench-vercel.zip` 得到文件夹（内含 index.html 和 api 文件夹）
2. 打开 https://vercel.com/new （登录你的 orangeman-coders-projects 账号）
3. 把整个文件夹拖到页面中央的部署区
4. 等待约 30 秒构建完成，点击 Visit 即可；之后可在 Settings 里绑定自定义域名

## 部署方式 B：命令行
```bash
npm i -g vercel
cd recipe-workbench        # 项目根目录（含 index.html 和 api/）
vercel login               # 浏览器里登录你的 Vercel 账号
vercel --prod              # 部署
```

## 部署后使用
- 手机/电脑浏览器直接打开分配的 https://xxx.vercel.app 地址
- 首次使用：右上角「模型与菜谱库设置」→ 填服务商 Base URL + API Key（硅基流动：https://api.siliconflow.cn/v1）
- 视觉模型推荐：`Qwen/Qwen3-VL-32B-Instruct`；文本模型推荐：`deepseek-ai/DeepSeek-V3.1`
- 点「测试连接」应显示「代理已就绪（站点内置 /api 转发）」，两个模型均 ✓
- 无需运行任何本地程序（本地开发时才需要 `node server.js`）

## 关于"小程序"
微信原生小程序需要注册小程序账号、开发者工具上传、平台审核，无法由本工具直接发布。
本版本为移动端 H5：在微信中打开链接可直接使用（设置里"添加到桌面"可获得接近小程序的全屏体验），
且相比小程序无审核、更新即时。

## 已知限制
- Vercel 免费版函数请求体上限 4.5MB：工作台单张图片压缩后约 0.2-0.4MB、最多 3 张，不会触碰限制
- API Key 保存在浏览器 localStorage，仅存于你自己的设备
