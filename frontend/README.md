# GeoAlbum Frontend

地理相册前端应用，基于 React + TypeScript + Tailwind CSS + Vite 构建。

## 功能特性

### 1. 用户认证系统
- 用户注册与登录
- JWT 令牌认证
- 路由保护

### 2. 地图界面
- 基于 Leaflet 的交互式地图
- 显示照片地理位置标记
- 支持缩放、平移等地图操作
- 点击标记查看照片详情

### 3. 时间维度筛选
- 底部时间导航条
- 按年/月/日浏览照片
- 时间范围筛选功能
- 实时过滤地图显示内容

### 4. 相册管理
- 相册详情面板
- 照片浏览功能
- 上一张/下一张导航
- 缩略图快速跳转

### 5. 路径可视化
- 旅行路径展示
- 虚线箭头表示方向
- 路径信息弹窗
- 显示/隐藏路径控制

## 技术栈

- **React 19**: 前端框架
- **TypeScript**: 类型安全
- **Vite**: 构建工具
- **Tailwind CSS**: 样式框架
- **React Router**: 路由管理
- **Leaflet**: 地图库
- **Lucide React**: 图标库

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint
```

## 项目结构

```
src/
├── components/          # 公共组件
│   ├── MapView.tsx     # 地图组件
│   ├── TimelineBar.tsx # 时间导航条
│   └── AlbumPanel.tsx  # 相册面板
├── contexts/           # React Context
│   └── AuthContext.tsx # 认证上下文
├── lib/               # 工具库
│   └── api.ts         # API 客户端
├── pages/             # 页面组件
│   ├── HomePage.tsx   # 主页面
│   ├── LoginPage.tsx  # 登录页
│   └── RegisterPage.tsx # 注册页
├── types/             # TypeScript 类型定义
│   └── index.ts
├── App.tsx            # 应用根组件
├── main.tsx           # 应用入口
└── index.css          # 全局样式
```

## API 接口

所有 API 请求都通过 `/api/*` 端点，认证使用 JWT Bearer 令牌。

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/me` - 获取当前用户信息

### 照片接口
- `GET /api/photos` - 获取用户所有照片
- `GET /api/photo-single/:id` - 获取单个照片详情

### 相册接口
- `GET /api/albums` - 获取用户所有相册
- `GET /api/album-photos/:album_id` - 获取相册中的照片
- `GET /api/album-single/:id` - 获取单个相册详情

### 路径接口
- `GET /api/routes` - 获取用户所有路径

## 环境配置

开发模式下，Vite 配置了 API 代理：
- 前端运行在 `http://localhost:5173`
- API 请求自动代理到 `http://localhost:8080`

生产环境下，需要将前端构建产物嵌入到 Go 后端中。

## 开发注意事项

1. 所有状态管理都遵循最小化原则
2. 仅使用函数组件和 Hooks
3. 不使用 `any` 类型，所有类型都有明确定义
4. 谨慎引入第三方依赖
5. 遵循 React 最佳实践
