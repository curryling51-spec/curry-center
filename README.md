# curry-center 开发文档

## 环境要求

- Windows PowerShell
- Node.js 24
- npm
- 可访问 Supabase 和 Vercel

检查环境：

```powershell
node --version
npm --version
```

## 第一次运行

所有命令都在项目目录执行：

```powershell
cd D:\codex-work\curry-center
npm install
```

从示例创建本地环境变量文件：

```powershell
Copy-Item .env.example .env
```

本地 `.env` 必须包含：

```text
NUXT_PUBLIC_SUPABASE_URL=https://cyidpopllnybrjpvphyk.supabase.co
NUXT_SUPABASE_SECRET_KEY=从 Vercel Production 拉取
NUXT_SESSION_SECRET=从 Vercel Production 拉取或生成新的长字符串
```

已连接 Vercel 项目时，直接拉取 Production 环境变量：

```powershell
npx --yes --cache .npm-cache vercel@58.9.1 env pull .env --environment=production --scope curry4
```

也可以生成新的本地 `NUXT_SESSION_SECRET`：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`.env` 只在本机使用，不会进入源码备份。

## 启动开发环境

```powershell
npm run dev
```

启动成功后访问：

```text
http://localhost:9830
http://localhost:9830/admin
```

开发服务由使用者自己启动和关闭。终端按 `Ctrl+C` 可以停止服务，不要重复启动多个开发服务。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm install` | 安装项目依赖 |
| `npm run dev` | 启动本地开发服务 |
| `npm run typecheck` | 检查 TypeScript 和 Vue 类型 |
| `npm run lint` | 检查代码规范 |
| `npm run test` | 执行一次自动化测试 |
| `npm run test:watch` | 持续监听并运行测试 |
| `npm run build` | 执行本地生产构建 |
| `npm run preview` | 预览本地生产构建结果 |
| `npm run backup:source` | 只生成源码 ZIP |
| `npm run deploy:prod` | 生成源码 ZIP 并发布到 Vercel Production |

如果 `npm run dev` 正在运行并占用 `.nuxt/nuxt.lock`，不要同时执行 `npm run build`，也不要为了构建停止开发服务。正式上线会在 Vercel 隔离环境重新构建。

## 上线发布

完整步骤见 [PROJECT_NOTES.md](./PROJECT_NOTES.md)。正式发布统一使用：

```powershell
npm run deploy:prod
```

不要直接绕过这个命令调用 Vercel，否则可能不会更新线上源码备份。

## 源码备份

`npm run deploy:prod` 会先执行 `npm run backup:source`，生成：

```text
server/assets/source-backup.zip
server/assets/source-backup.json
```

备份会随服务端一起部署，但不会作为公开静态文件暴露。只有超级管理员登录后台后，才能从“系统设置 → 源码备份”下载。

备份不包含：

```text
.env
.git
node_modules
.nuxt
.output
.vercel
.npm-cache
```

## 前台访问验证

访问规则在后台 `/admin/access` 配置。每条规则有独立 Key 和图案，图案只以 `scrypt` 哈希保存。连续失败 5 次后，当前 Key 与来源 IP 锁定 24 小时；验证成功后的签名 Cookie 保留 7 天。

需要验证的页面声明规则 Key：

```ts
definePageMeta({
  middleware: 'front-access',
  frontAccessKey: 'checkin'
})
```

对应的服务端 API 必须使用相同 Key：

```ts
await requireFrontAccess(event, 'checkin')
```

## 数据库

数据库和图片存储均由 Supabase 提供，换电脑或重新部署不需要搬迁业务数据。

业务数据删除使用 `deleted_at` 软删除。恢复数据只能在 Supabase 中手动将 `deleted_at` 改回 `NULL`。

主要数据表：

```text
public.recipes
public.admin_users
public.plans
public.plan_checkins
public.knowledge_categories
public.knowledge_articles
public.front_access_rules
public.front_access_attempts
public.food_orders
public.food_order_items
```

关键数据库函数：

```text
public.create_food_order
public.get_plan_checkin_stats
```

管理员密码只以哈希形式保存在 `public.admin_users`，角色为 `super` 或 `admin`。知识库图片保存在 Supabase Storage 的 `knowledge-images` 桶。
