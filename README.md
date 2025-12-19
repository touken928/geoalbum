# GeoAlbum 地理相册

一个基于地图的照片管理应用，在地图上记录旅行足迹，管理照片回忆。（A map-based photo management app for recording travel footprints and managing photo memories.）

![截图](assert/screenshot.png)

## ✨ 功能特性

- 🗺️ **地图标记** - 在高德地图上创建相册点，直观展示旅行轨迹
- 📸 **照片管理** - 支持多图上传，JPEG/PNG/HEIC 格式
- 🔗 **路径连接** - 设置相册间的"下一站"，用箭头展示旅行路线
- 📅 **时间筛选** - 按日期范围筛选相册
- 🎯 **智能聚合** - 相近位置的相册自动聚合
- 🔐 **用户系统** - 支持注册登录，数据隔离

## 🛠️ Tech Stack

**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Leaflet

**Backend**: Go + Gin + SQLite + JWT

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/yourusername/geoalbum.git
cd geoalbum

# Build frontend
cd frontend && npm install && npm run build && cd ..

# Run
go build -o geoalbum . && ./geoalbum
```

Visit http://localhost:8080

### Docker Deploy

```bash
cd docker && docker compose up -d
```

## 📄 License

MIT License
