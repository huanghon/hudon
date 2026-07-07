# Equipment Campaign Site

游戏装备领取活动页，包含前台展示页和后台配置页。当前版本使用 Node.js + Docker 部署，后台配置保存在 `data/site-config.json`。

## 本地运行

```bash
npm start
```

访问：

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin.html

## Docker 运行

```bash
docker compose up -d --build
```

或：

```bash
docker build -t equipment-campaign-site .
docker run -d --name equipment-campaign-site -p 3000:3000 -v equipment-campaign-data:/app/data equipment-campaign-site
```

## 数据持久化

- 初始配置：`data/site-config.json`
- 容器内运行数据：`/app/data/site-config.json`
- Docker 镜像内 seed 配置：`/app/data.seed/site-config.json`

如果挂载的 `/app/data` 是空目录，服务会自动用 seed 配置初始化。生产环境建议挂载持久化卷到 `/app/data`，避免后台修改的数据在重建容器后丢失。

## Zeabur 手动部署

1. 把本仓库导入 Zeabur。
2. 选择 Dockerfile 构建。
3. 确认服务端口为 `3000`，或让 Zeabur 读取 Dockerfile 的 `EXPOSE 3000`。
4. 部署完成后，在 Zeabur 控制台手动绑定域名。
5. 如需持久化后台修改的数据，在 Zeabur 控制台为 `/app/data` 配置持久化存储。

## 健康检查

```text
GET /healthz
```

返回：

```json
{"ok":true}
```
