# 发布上线步骤

## 一、进入项目目录

```powershell
cd D:\codex-work\curry-center
```

## 二、首次配置电脑

一台新电脑只需要执行一次：

```powershell
npm install
npx --yes --cache .npm-cache vercel@58.9.1 login
npx --yes --cache .npm-cache vercel@58.9.1 link --scope curry4
```

执行 `link` 时选择已有项目 `curry-center`，不要创建同名新项目。成功后项目根目录会生成：

```text
.vercel/project.json
```

其中应显示：

```json
{
  "projectName": "curry-center"
}
```

## 三、配置 Production 环境变量

Vercel Production 必须存在以下三个变量：

```text
NUXT_PUBLIC_SUPABASE_URL
NUXT_SUPABASE_SECRET_KEY
NUXT_SESSION_SECRET
```

当前项目已经配置过。只有首次创建 Vercel 项目或变量发生变化时，才执行：

```powershell
npx --yes --cache .npm-cache vercel@58.9.1 env add NUXT_PUBLIC_SUPABASE_URL production --scope curry4
npx --yes --cache .npm-cache vercel@58.9.1 env add NUXT_SUPABASE_SECRET_KEY production --scope curry4
npx --yes --cache .npm-cache vercel@58.9.1 env add NUXT_SESSION_SECRET production --scope curry4
```

每条命令会提示输入对应的值。Supabase secret key 和会话密钥不能写入 README 或源码。

检查 Production 变量名称：

```powershell
npx --yes --cache .npm-cache vercel@58.9.1 env ls production --scope curry4
```

不要在每次发布前重复添加环境变量。

## 四、本地启动

第一次启动：

```powershell
npm install
npx --yes --cache .npm-cache vercel@58.9.1 login
npx --yes --cache .npm-cache vercel@58.9.1 link --scope curry4
npx --yes --cache .npm-cache vercel@58.9.1 env pull .env --environment=production --scope curry4
npm run dev
```

本地开发地址：

```text
http://localhost:9830
http://localhost:9830/admin
```

线上站点不需要手动启动服务。Vercel 会运行 Nuxt 服务端代码，Supabase 独立保存数据库和图片。

## 五、发布前检查

依次执行：

```powershell
npm run typecheck
npm run lint
npm run test
```

如果本地开发服务没有运行，再执行：

```powershell
npm run build
```

如果 `npm run dev` 正在运行或存在 `.nuxt/nuxt.lock`，跳过本地构建，不要停止开发服务；Vercel 会执行完整生产构建。

## 六、正式发布

只执行这一条：

```powershell
npm run deploy:prod
```

这条命令会自动完成：

1. 上传项目到 Vercel。
2. 在 Vercel 隔离环境运行 `npm run build`。
3. 将成功构建的版本切换到 Production。
4. 将正式域名指向最新部署。

不要同时重复执行发布命令。等待终端出现：

```text
readyState: READY
Aliased https://curry-center.vercel.app
```

## 七、上线后验证

依次打开：

```text
https://curry-center.vercel.app
https://curry-center.vercel.app/checkin
https://curry-center.vercel.app/admin
```

检查健康接口：

```powershell
Invoke-RestMethod https://curry-center.vercel.app/api/health
```

正常结果：

```text
status: online
```

## 八、换电脑恢复项目

1. 从 GitHub 克隆 `curryling51-spec/curry-center`。
2. 在项目目录执行：

```powershell
npm install
npx --yes --cache .npm-cache vercel@58.9.1 login
npx --yes --cache .npm-cache vercel@58.9.1 link --scope curry4
npx --yes --cache .npm-cache vercel@58.9.1 env pull .env --environment=production --scope curry4
npm run dev
```

Supabase 数据已经在云端，恢复源码后不需要导入数据库。以后修改完成，继续执行“发布前检查”和 `npm run deploy:prod`。

## 九、常见问题

- 出现 `nuxt.lock`：说明开发服务正在使用 Nuxt 缓存，跳过本地构建即可。
- 找不到 Vercel 项目：重新执行 `vercel login` 和 `vercel link --scope curry4`。
- 发布长时间没有结果：不要重复发布，先等待当前命令完成，再到 Vercel Deployments 查看状态。
