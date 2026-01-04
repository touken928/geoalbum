# GeoAlbum 地理相册

A map-based photo management app for recording travel footprints and managing photo memories.

![截图](assert/screenshot.png)

## ✨ 功能特性

- **地图标记** - 在高德地图上创建相册点，直观展示旅行轨迹
- **智能搜索**  - 模糊搜索相册，快速定位目标
- **图层切换** - 支持矢量地图和卫星影像切换
- **实时坐标** - 鼠标悬停显示经纬度，地图比例尺
- **双语支持** - 中英文界面一键切换
- **用照片管理** - 支持多图上传，JPEG/PNG/HEIC 格式
- **路径连接** - 设置相册间的"下一站"，用箭头展示旅行路线
- **时间筛选** - 按日期范围筛选相册
- **智能聚合** - 相近位置的相册自动聚合
- **用户系统** - 支持注册登录，数据隔离

## 🛠️ Tech Stack

**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Cesium

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
