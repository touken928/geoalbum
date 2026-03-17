# GeoAlbum 地理相册

基于地图的照片管理应用，记录旅行足迹，管理照片回忆。

![截图](assert/screenshot.png)

## 功能特性

- **地图标记** - 在高德地图上创建相册点，直观展示旅行轨迹
- **智能搜索** - 模糊搜索相册，快速定位目标
- **图层切换** - 支持矢量地图和卫星影像切换
- **实时坐标** - 鼠标悬停显示经纬度，地图比例尺
- **双语支持** - 中英文界面一键切换
- **照片管理** - 支持多图上传，JPEG/PNG/HEIC 格式
- **路径连接** - 设置相册间的"下一站"，用箭头展示旅行路线
- **时间筛选** - 按日期范围筛选相册
- **智能聚合** - 相近位置的相册自动聚合
- **用户系统** - 支持注册登录，数据隔离

## 获取

### Docker 拉取（推荐）

```bash
docker pull ghcr.io/touken928/geoalbum:latest
```

支持 amd64 和 arm64 架构。

### GitHub Release 下载

访问 [ Releases ](https://github.com/touken928/geoalbum/releases) 下载对应平台的压缩包。

## 部署

```bash
mkdir geoalbum && cd geoalbum
docker run -d -p 8080:8080 -v $(pwd)/data:/app/data ghcr.io/touken928/geoalbum:latest
```

访问 http://localhost:8080

## 技术栈

**前端**：React 18 + TypeScript + Vite + Tailwind CSS + Cesium

**后端**：Go + Gin + SQLite + JWT

## 开源协议

MIT