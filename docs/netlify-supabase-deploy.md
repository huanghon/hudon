# Netlify + Supabase 部署说明

这个版本使用 `public/` 作为静态站点，使用 Netlify Functions 提供 `/api/*` 接口，使用 Supabase 保存后台配置和上传图片。

## 1. Supabase 建表

在 Supabase 项目的 SQL Editor 执行：

```sql
create table if not exists site_configs (
  id text primary key,
  config jsonb not null,
  updated_at timestamptz default now()
);
```

当前函数使用 `SUPABASE_SERVICE_ROLE_KEY` 访问数据库，所以可以不开放前端读写权限。不要把 service role key 写进前端代码。

## 2. Supabase 创建图片 bucket

在 Storage 里创建 bucket：

```text
campaign-assets
```

建议设置为 public bucket，因为页面会直接展示上传后的图片 URL。

如果你想换 bucket 名称，在 Netlify 环境变量里设置：

```text
SUPABASE_STORAGE_BUCKET=你的bucket名
```

## 3. Netlify 环境变量

在 Netlify 项目设置里添加：

```text
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
SUPABASE_STORAGE_BUCKET=campaign-assets
ADMIN_PASSWORD=123456
SUPABASE_CONFIG_ID=default
```

说明：

- `ADMIN_PASSWORD` 只在 Supabase 还没有配置记录时作为默认密码。
- 后台里修改访问密码后，新密码会保存到 Supabase 的 `site_configs.config.accessPassword`。
- `SUPABASE_CONFIG_ID` 默认是 `default`，适合一个站点一套配置。

## 4. Netlify 部署设置

本仓库已经包含 `netlify.toml`：

```toml
[build]
  publish = "public"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

导入 Git 仓库后，Netlify 会发布 `public/`，并把 `/api/config`、`/api/auth`、`/api/reset`、`/api/upload` 转到对应函数。

## 5. 后台使用

访问：

```text
https://你的站点.netlify.app/admin.html
```

默认密码：

```text
123456
```

如果 Supabase 已经有配置记录，以配置记录里的 `accessPassword` 为准。

## 6. 接口清单

```text
POST /api/auth
GET  /api/config
PUT  /api/config
POST /api/reset
POST /api/upload
```

上传图片会先写入 Supabase Storage，再把公开 URL 保存到配置 JSON。不要再把大图片 data URL 长期塞进配置里。

## 7. 费用提醒

小活动页通常可以使用 Netlify 和 Supabase 免费额度起步。后续如果图片很多、访问量大、或需要多活动/多管理员/访问统计，建议单独报价升级。
