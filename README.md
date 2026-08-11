# 二手交易平台

基于 Monorepo 架构的 二手交易平台

## 项目结构

```
.
├── frontend/              # React Native 移动应用
├── server/                # Node.js 后端服务
├── .vscode/               # VSCode 编辑器配置(方便配置prettier和eslint使用)
├── eslint.config.mjs      # ESLint 配置（统一管理）
├── .prettierrc             # Prettier 配置（统一管理）
├── .gitignore             # Git 忽略规则
└── README.md
```

## 快速开始

### 前置条件

- Node.js 23+
- pnpm 10+
- java 17+ (android开发需要)
- pg 数据库


### 安装依赖

分别进入各目录
```
cd frontend && pnpm install
cd ../server && pnpm install
```

### 运行项目

#### 前端

```bash
cd frontend

# 开发模式
pnpm start

# 构建
pnpm build

# 代码格式化
pnpm format

# ESLint 检查
pnpm lint 
```

#### 后端

```bash
cd server

# 开发模式（监听文件变化）
pnpm dev

# 构建
pnpm build

# 启动生产服务
pnpm start

# 代码格式化
pnpm format

# ESLint 检查
pnpm lint
```

## 项目详情

### Frontend

- **框架**: React Native + Expo
- **语言**: TypeScript
- **状态管理**: 暂时未使用
- **API 请求**: Axios

### Server

- **框架**: Node.js express
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **认证**: JWT 双token轮转

## 开发规范

### 代码风格

本项目使用统一的代码风格配置：

- **Prettier**: 规范代码格式
- **ESLint**: 代码质量检查
- **TypeScript**: 类型检查

## 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 常见问题

### Q: 前后端能分别使用不同的 ESLint 规则吗？

A: 可以。根目录的 `eslint.config.mjs` 使用 `files` 模式区分：
- `frontend/**/*` - React Native 规则
- `server/**/*` - Node.js 规则

## 贡献

欢迎提交 Issue 和 Pull Request！

