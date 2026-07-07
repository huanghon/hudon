# Docker 部署说明

这个项目现在可以直接用 Docker 运行，业务代码仍然是 Node.js 静态站点 + 后台配置服务。

## 本地运行

```bash
docker compose up -d --build
```

访问：

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin.html

## 单独构建镜像

```bash
docker build -t equipment-campaign-site .
docker run -d --name equipment-campaign-site -p 3000:3000 -v equipment-campaign-data:/app/data equipment-campaign-site
```

## 数据说明

- 当前配置文件：`data/site-config.json`
- Docker 镜像会同时复制一份到 `/app/data.seed/site-config.json`
- 如果挂载的数据卷 `/app/data` 是空的，服务首次启动会自动用 seed 配置初始化
- 后台保存后的配置会写到容器内的 `DATA_DIR/site-config.json`

生产环境建议挂载持久化卷到 `/app/data`，否则重新创建容器后后台修改的数据可能丢失。

## 健康检查

```text
GET /healthz
```

返回：

```json
{"ok":true}
```

## Zeabur 使用

把整个项目上传到 Zeabur，Zeabur 会识别 `Dockerfile` 构建镜像。服务运行后再在控制台手动绑定域名即可。
