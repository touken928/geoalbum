# GeoAlbum 地理相册

一个基于地图的照片管理应用，在地图上记录旅行足迹，管理照片回忆。
(A map-based photo management app for recording travel footprints and managing photo memories on a map.)

## ✨ 功能特性 (Features)

- �️ **片地图标记 (Map Markers)** - 在高德地图上创建相册点，直观展示旅行轨迹 (Create album points on the map to visualize travel routes)
- � **照片连管理 (Photo Management)** - 支持多图上传，JPEG/PNG/HEIC 格式 (Multi-photo upload, supports JPEG/PNG/HEIC)
- � **路间径连接 (Path Connection)** - 设置相册间的"下一站"，用箭头展示旅行路线 (Set "next destination" between albums to show travel paths with arrows)
- 📅 **时间筛选 (Time Filter)** - 按日期范围筛选相册 (Filter albums by date range)
- 🎯 **智能聚合 (Smart Clustering)** - 相近位置的相册自动聚合 (Nearby albums auto-cluster on the map)
- 🔐 **用户系统 (User System)** - 支持注册登录，数据隔离 (Registration/login with data isolation)

## 🛠️ 技术栈 (Tech Stack)

**前端 (Frontend)**: React 18 + TypeScript + Vite + Tailwind CSS + Leaflet

**后端 (Backend)**: Go + Gin + SQLite + JWT

## 🚀 快速开始 (Quick Start)

```bash
# 克隆项目 (Clone)
git clone https://github.com/yourusername/geoalbum.git
cd geoalbum

# 前端构建 (Build frontend)
cd frontend && npm install && npm run build && cd ..

# 运行 (Run)
go build -o geoalbum . && ./geoalbum
```

访问 (Visit) http://localhost:8080

### Docker 部署 (Docker Deploy)

```bash
cd docker && docker compose up -d
```

## 📄 License

MIT License
