# Second Hand Trading Server

基于 Express + TypeScript + PostgreSQL 的二手交易平台后端服务。

## 技术栈

- Express - Web 框架
- TypeScript - 类型安全
- PostgreSQL - 数据库
- Prisma - ORM
- JWT - 认证（access token + refresh token）
- Zod - 数据验证
- bcrypt - 密码加密

## 数据模型

- **User** - 用户表（手机号登录）
- **Category** - 商品分类
- **Product** - 商品/租赁物品
- **RentalRecord** - 租借记录
- **RefreshToken** - JWT refresh token

## 开发前准备

1. 确保已安装 PostgreSQL 并正在运行
2. `.env` 文件中数据库连接已配置

## 安装依赖

```bash
pnpm install
```

## 数据库设置

```bash
# 初始化 Prisma Client
npx prisma generate

# 推送 schema 到数据库
npx prisma db push
```

## 开发模式

```bash
pnpm dev
```

## 构建

```bash
pnpm build
```

## 生产模式

```bash
pnpm start
```

## API 端点

### 认证

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新 access token
- `GET /api/auth/me` - 获取当前用户信息（需要认证）
- `POST /api/auth/logout` - 登出（需要认证）

### 商品

- `GET /api/products` - 获取商品列表
- `GET /api/products/:id` - 获取商品详情
- `POST /api/products` - 创建商品（需要认证）
- `PUT /api/products/:id` - 更新商品（需要认证）
- `DELETE /api/products/:id` - 删除商品（需要认证）
- `GET /api/products/my/list` - 获取我的商品（需要认证）

### 分类

- `GET /api/categories` - 获取所有分类
- `GET /api/categories/:id` - 获取单个分类

### 租借

- `POST /api/rentals` - 创建租借请求（需要认证）
- `GET /api/rentals/renter` - 我作为租借者的记录（需要认证）
- `GET /api/rentals/owner` - 我作为出租者的记录（需要认证）
- `GET /api/rentals/:id` - 获取租借记录详情（需要认证）
- `PUT /api/rentals/:id/status` - 更新租借状态（需要认证）

### 健康检查

- `GET /api/health` - 服务健康状态
