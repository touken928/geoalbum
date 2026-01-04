import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { MapComponentProps, Album } from '../types';
import CoordinateDisplay from './CoordinateDisplay';

// 禁用 Cesium Ion
Cesium.Ion.defaultAccessToken = '';

// 扩展 Entity 类型
declare module 'cesium' {
  interface Entity {
    albumData?: Album;
  }
}

// 创建流动箭头纹理
const createArrowTexture = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  // 透明背景
  ctx.clearRect(0, 0, 64, 16);

  // 绘制多个箭头
  ctx.fillStyle = '#3b82f6';
  for (let i = 0; i < 2; i++) {
    const x = i * 32 + 8;
    ctx.beginPath();
    ctx.moveTo(x + 16, 8);
    ctx.lineTo(x, 2);
    ctx.lineTo(x + 4, 8);
    ctx.lineTo(x, 14);
    ctx.closePath();
    ctx.fill();
  }

  return canvas.toDataURL();
};

// 创建美化的单个标记图标
const createMarkerImage = (hasPhotos: boolean, count: number): string => {
  const canvas = document.createElement('canvas');
  const width = 48;
  const height = 64;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const centerX = width / 2;
  const mainColor = hasPhotos ? '#3b82f6' : '#64748b';
  const lightColor = hasPhotos ? '#93c5fd' : '#94a3b8';
  const darkColor = hasPhotos ? '#1d4ed8' : '#475569';

  // 阴影
  ctx.beginPath();
  ctx.ellipse(centerX, height - 4, 12, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fill();

  // 水滴外形
  ctx.beginPath();
  ctx.moveTo(centerX, height - 8);
  ctx.bezierCurveTo(centerX - 6, height - 18, 6, 32, 6, 22);
  ctx.arc(centerX, 22, 18, Math.PI, 0, false);
  ctx.bezierCurveTo(width - 6, 32, centerX + 6, height - 18, centerX, height - 8);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, lightColor);
  gradient.addColorStop(0.5, mainColor);
  gradient.addColorStop(1, darkColor);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 内圆
  ctx.beginPath();
  ctx.arc(centerX, 22, 13, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  // 相机图标
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.roundRect(centerX - 8, 18, 16, 10, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX, 23, 4, 0, Math.PI * 2);
  ctx.fillStyle = darkColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX, 23, 2, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.fillStyle = mainColor;
  ctx.fillRect(centerX + 4, 16, 3, 2);

  // 徽章
  if (count > 0) {
    const badgeX = centerX + 14;
    const badgeY = 8;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY + 1, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 10, 0, Math.PI * 2);
    const badgeGradient = ctx.createRadialGradient(badgeX - 2, badgeY - 2, 0, badgeX, badgeY, 10);
    badgeGradient.addColorStop(0, '#f87171');
    badgeGradient.addColorStop(1, '#dc2626');
    ctx.fillStyle = badgeGradient;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count > 99 ? '99+' : count.toString(), badgeX, badgeY);
  }

  return canvas.toDataURL();
};

// 创建聚合图标
const createClusterImage = (count: number): string => {
  const canvas = document.createElement('canvas');
  const size = 52;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 4;

  let mainColor: string, lightColor: string, darkColor: string;
  if (count >= 50) {
    mainColor = '#ef4444'; lightColor = '#fca5a5'; darkColor = '#b91c1c';
  } else if (count >= 20) {
    mainColor = '#f97316'; lightColor = '#fdba74'; darkColor = '#c2410c';
  } else if (count >= 10) {
    mainColor = '#eab308'; lightColor = '#fde047'; darkColor = '#a16207';
  } else {
    mainColor = '#3b82f6'; lightColor = '#93c5fd'; darkColor = '#1d4ed8';
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY + 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  const outerGradient = ctx.createRadialGradient(centerX - 5, centerY - 5, 0, centerX, centerY, radius);
  outerGradient.addColorStop(0, lightColor);
  outerGradient.addColorStop(0.7, mainColor);
  outerGradient.addColorStop(1, darkColor);
  ctx.fillStyle = outerGradient;
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 6, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  ctx.fillStyle = mainColor;
  ctx.font = `bold ${count >= 100 ? 12 : 14}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(count > 999 ? '999+' : count.toString(), centerX, centerY);

  return canvas.toDataURL();
};

// 聚合图标缓存
const clusterImageCache = new Map<string, string>();
const getClusterImage = (count: number): string => {
  const key = count >= 100 ? '100+' : count >= 50 ? '50+' : count >= 20 ? '20+' : count >= 10 ? '10+' : count.toString();
  if (!clusterImageCache.has(key)) {
    clusterImageCache.set(key, createClusterImage(count));
  }
  return clusterImageCache.get(key)!;
};

// 缓存箭头纹理
let arrowTextureCache: string | null = null;
const getArrowTexture = (): string => {
  if (!arrowTextureCache) {
    arrowTextureCache = createArrowTexture();
  }
  return arrowTextureCache;
};


const CesiumMapComponent: React.FC<MapComponentProps> = ({
  albums,
  selectedTimeRange,
  onAlbumClick,
  onMapClick,
  showPaths,
  paths,
  isCreateMode = false,
  className = '',
  currentLayer = 'vector',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
  const pathPrimitiveRef = useRef<Cesium.PrimitiveCollection | null>(null);
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  const clusterListenerRef = useRef<Cesium.Event.RemoveCallback | null>(null);
  const isCreateModeRef = useRef(isCreateMode);
  const onMapClickRef = useRef(onMapClick);
  const onAlbumClickRef = useRef(onAlbumClick);
  const [mouseCoords, setMouseCoords] = useState<[number, number] | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => { isCreateModeRef.current = isCreateMode; }, [isCreateMode]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onAlbumClickRef.current = onAlbumClick; }, [onAlbumClick]);

  const filteredAlbums = React.useMemo(() => {
    if (!selectedTimeRange) return albums;
    return albums.filter((album) => {
      const albumDate = new Date(album.created_at);
      return albumDate >= selectedTimeRange.startDate && albumDate <= selectedTimeRange.endDate;
    });
  }, [albums, selectedTimeRange]);

  const getAmapImageryProvider = React.useCallback((style: 'vector' | 'satellite') => {
    const url = style === 'satellite'
      ? 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
      : 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
    return new Cesium.UrlTemplateImageryProvider({
      url,
      subdomains: ['1', '2', '3', '4'],
      maximumLevel: 18,
      minimumLevel: 1,
    });
  }, []);

  // 初始化 Viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      sceneMode: Cesium.SceneMode.SCENE3D,
      contextOptions: { webgl: { alpha: true } },
      orderIndependentTranslucency: false,
      shadows: false,
      shouldAnimate: true,
    });

    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(getAmapImageryProvider(currentLayer));
    (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

    const scene = viewer.scene;
    const controller = scene.screenSpaceCameraController;
    controller.enableRotate = true;
    controller.enableZoom = true;
    controller.enableTilt = false;
    controller.enableLook = false;
    controller.minimumZoomDistance = 500;
    controller.maximumZoomDistance = 20000000;

    scene.globe.enableLighting = false;
    scene.globe.showGroundAtmosphere = false;
    if (scene.sun) scene.sun.show = false;
    if (scene.moon) scene.moon.show = false;

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(105, 35, 6000000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
    });

    // 数据源
    const dataSource = new Cesium.CustomDataSource('albums');
    viewer.dataSources.add(dataSource);
    dataSourceRef.current = dataSource;

    // 聚合
    dataSource.clustering.enabled = true;
    dataSource.clustering.pixelRange = 80;
    dataSource.clustering.minimumClusterSize = 2;

    clusterListenerRef.current = dataSource.clustering.clusterEvent.addEventListener(
      (clusteredEntities: Cesium.Entity[], cluster: { label: Cesium.Label; billboard: Cesium.Billboard }) => {
        cluster.label.show = false;
        cluster.billboard.show = true;
        cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.CENTER;
        cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        cluster.billboard.image = getClusterImage(clusteredEntities.length);
        cluster.billboard.width = 52;
        cluster.billboard.height = 52;
        (cluster.billboard as any).id = clusteredEntities;
      }
    );

    // 路径 Primitive 集合
    const pathPrimitives = new Cesium.PrimitiveCollection();
    viewer.scene.primitives.add(pathPrimitives);
    pathPrimitiveRef.current = pathPrimitives;

    viewerRef.current = viewer;

    // 相机变化监听
    viewer.camera.changed.addEventListener(() => {
      const camera = viewer.camera;
      const targetPitch = Cesium.Math.toRadians(-90);
      if (Math.abs(camera.pitch - targetPitch) > 0.01) {
        const cartographic = camera.positionCartographic;
        camera.setView({
          destination: Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height),
          orientation: { heading: 0, pitch: targetPitch, roll: 0 },
        });
      }
      // 重新聚合
      if (dataSource.clustering.enabled) {
        const pr = dataSource.clustering.pixelRange;
        dataSource.clustering.pixelRange = pr + 0.1;
        dataSource.clustering.pixelRange = pr;
      }
    });

    // 事件处理
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handlerRef.current = handler;

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const pickedObject = scene.pick(movement.position);
      if (Cesium.defined(pickedObject)) {
        const id = pickedObject.id;
        if (Array.isArray(id) && id.length > 0) {
          const coords: { lon: number; lat: number }[] = [];
          id.forEach((entity: Cesium.Entity) => {
            if (entity.albumData) coords.push({ lon: entity.albumData.longitude, lat: entity.albumData.latitude });
          });
          if (coords.length > 0) {
            const lons = coords.map(c => c.lon);
            const lats = coords.map(c => c.lat);
            const west = Math.min(...lons), east = Math.max(...lons);
            const south = Math.min(...lats), north = Math.max(...lats);
            const lonPad = Math.max((east - west) * 0.3, 0.01);
            const latPad = Math.max((north - south) * 0.3, 0.01);
            viewer.camera.flyTo({
              destination: Cesium.Rectangle.fromDegrees(west - lonPad, south - latPad, east + lonPad, north + latPad),
              orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
              duration: 1.0,
            });
          }
        } else if (id instanceof Cesium.Entity && id.albumData) {
          onAlbumClickRef.current(id.albumData);
        }
      } else if (isCreateModeRef.current) {
        const ray = viewer.camera.getPickRay(movement.position);
        if (ray) {
          const cartesian = scene.globe.pick(ray, scene);
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            onMapClickRef.current([Cesium.Math.toDegrees(cartographic.latitude), Cesium.Math.toDegrees(cartographic.longitude)]);
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const ray = viewer.camera.getPickRay(movement.endPosition);
      if (ray) {
        const cartesian = scene.globe.pick(ray, scene);
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          setMouseCoords([Cesium.Math.toDegrees(cartographic.latitude), Cesium.Math.toDegrees(cartographic.longitude)]);
        }
      }
      const pickedObject = scene.pick(movement.endPosition);
      viewer.canvas.style.cursor = Cesium.defined(pickedObject) ? 'pointer' : (isCreateModeRef.current ? 'crosshair' : 'grab');
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    setIsReady(true);

    return () => {
      if (clusterListenerRef.current) clusterListenerRef.current();
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      dataSourceRef.current = null;
      pathPrimitiveRef.current = null;
      handlerRef.current = null;
      setIsReady(false);
    };
  }, [getAmapImageryProvider]);


  // 更新图层
  useEffect(() => {
    if (!viewerRef.current || !isReady) return;
    viewerRef.current.imageryLayers.removeAll();
    viewerRef.current.imageryLayers.addImageryProvider(getAmapImageryProvider(currentLayer));
  }, [currentLayer, isReady, getAmapImageryProvider]);

  // 更新相册标记
  useEffect(() => {
    if (!dataSourceRef.current || !isReady) return;
    const dataSource = dataSourceRef.current;
    dataSource.entities.removeAll();

    filteredAlbums.forEach((album) => {
      const photoCount = album.photo_count || 0;
      const entity = dataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(album.longitude, album.latitude),
        billboard: {
          image: createMarkerImage(photoCount > 0, photoCount),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          width: 48,
          height: 64,
        },
      });
      entity.albumData = album;
    });
  }, [filteredAlbums, isReady]);

  // 更新路径 - 使用 Primitive 和流动材质
  useEffect(() => {
    if (!pathPrimitiveRef.current || !viewerRef.current || !isReady) return;
    const primitives = pathPrimitiveRef.current;

    // 清除旧路径
    primitives.removeAll();

    if (!showPaths) return;

    // 创建流动箭头材质
    const arrowMaterialSource = `
      czm_material czm_getMaterial(czm_materialInput materialInput) {
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st;
        float time = czm_frameNumber * speed;
        vec4 colorImage = texture(image, vec2(fract(st.s - time * 0.005), st.t));
        material.alpha = colorImage.a * color.a;
        material.diffuse = color.rgb;
        return material;
      }
    `;

    paths.forEach((path) => {
      if (!path.from_album || !path.to_album) return;

      if (selectedTimeRange) {
        const fromDate = new Date(path.from_album.created_at);
        const toDate = new Date(path.to_album.created_at);
        if (fromDate < selectedTimeRange.startDate || toDate > selectedTimeRange.endDate) return;
      }

      const positions = Cesium.Cartesian3.fromDegreesArray([
        path.from_album.longitude, path.from_album.latitude,
        path.to_album.longitude, path.to_album.latitude,
      ]);

      const material = new Cesium.Material({
        fabric: {
          uniforms: {
            color: Cesium.Color.fromCssColorString('#3b82f6').withAlpha(0.9),
            image: getArrowTexture(),
            speed: 5,
          },
          source: arrowMaterialSource,
        },
        translucent: () => true,
      });

      const appearance = new Cesium.PolylineMaterialAppearance({ material });

      const primitive = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions,
            width: 8.0,
          }),
        }),
        appearance,
        asynchronous: false,
      });

      primitives.add(primitive);
    });
  }, [paths, showPaths, selectedTimeRange, isReady]);

  // 更新鼠标样式
  useEffect(() => {
    if (!viewerRef.current) return;
    viewerRef.current.canvas.style.cursor = isCreateMode ? 'crosshair' : 'grab';
  }, [isCreateMode]);

  return (
    <div className={className} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {mouseCoords && (
        <CoordinateDisplay coordinates={mouseCoords} />
      )}

      {isCreateMode && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)', zIndex: 1000, pointerEvents: 'none',
          fontSize: 14, fontWeight: 500,
        }}>
          点击地图选择相册位置
        </div>
      )}
    </div>
  );
};

export default CesiumMapComponent;
