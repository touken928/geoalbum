/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  zh: {
    // Header
    'app.title': 'GeoAlbum',
    'app.subtitle': '地理相册',
    'header.createAlbum': '创建相册',
    'header.cancelCreate': '取消创建',
    'header.showPaths': '显示路径',
    'header.logout': '退出',
    
    // Toolbar
    'toolbar.tools': '工具',
    'toolbar.mapLayer': '地图图层',
    'toolbar.collapse': '收起',
    
    // Map
    'map.clickToSelect': '点击地图选择相册位置',
    'map.noAlbums': '所选时间区间内无相册',
    'map.loading': '加载地图数据中...',
    'map.coordinates': '经纬度',
    'map.scale': '比例尺',
    
    // Search
    'search.placeholder': '搜索相册...',
    'search.noResults': '未找到相册',
    'search.results': '个结果',
    
    // Layer control
    'layer.vector': '矢量地图',
    'layer.satellite': '卫星影像',
    
    // Date filter
    'date.startDate': '开始日期',
    'date.endDate': '结束日期',
    'date.reset': '重置',
    'date.showing': '显示',
    'date.of': '/',
    'date.albums': '个相册',
    
    // Album
    'album.title': '标题',
    'album.description': '描述',
    'album.photos': '张照片',
    'album.create': '创建',
    'album.cancel': '取消',
    'album.edit': '编辑',
    'album.delete': '删除',
    'album.save': '保存',
    'album.titlePlaceholder': '相册标题',
    'album.descriptionPlaceholder': '添加相册描述...',
    'album.noDescription': '暂无描述',
    'album.noPhotos': '暂无照片',
    'album.noPhotosHint': '点击上传按钮添加照片',
    'album.loadingPhotos': '加载照片中...',
    'album.coordinates': '坐标',
    'album.nextDestination': '下一站',
    'album.setNextDestination': '设置下一站',
    'album.modifyNextDestination': '修改下一站',
    'album.uploadPhoto': '上传照片',
    'album.editAlbum': '编辑相册',
    'album.deleteAlbum': '删除相册',
    'album.retry': '重试',
    'album.loadPhotosFailed': '加载照片失败',
    'album.saveFailed': '保存失败',
    'album.deletePhotoFailed': '删除照片失败',
    'album.deleteAlbumFailed': '删除相册失败',
    'album.deletePasswordError': '请输入 delete 确认删除',
    'album.confirmDeleteAlbum': '确认删除相册',
    'album.confirmDeletePhoto': '确认删除照片',
    'album.deleteAlbumWarning': '删除相册将同时删除所有照片，此操作不可恢复。请输入',
    'album.deleteAlbumWarning2': '确认删除。',
    'album.deletePhotoWarning': '确定要删除这张照片吗？此操作不可恢复。',
    'album.deletePasswordPlaceholder': '输入 delete 确认',
    'album.deleting': '删除中...',
    'album.confirmDelete': '确认删除',
    
    // Common
    'common.error': '错误',
    'common.success': '成功',
    'common.confirm': '确认',
    'common.close': '关闭',
  },
  en: {
    // Header
    'app.title': 'GeoAlbum',
    'app.subtitle': 'Geographic Album',
    'header.createAlbum': 'Create Album',
    'header.cancelCreate': 'Cancel',
    'header.showPaths': 'Show Paths',
    'header.logout': 'Logout',
    
    // Toolbar
    'toolbar.tools': 'Tools',
    'toolbar.mapLayer': 'Map Layer',
    'toolbar.collapse': 'Collapse',
    
    // Map
    'map.clickToSelect': 'Click map to select album location',
    'map.noAlbums': 'No albums in selected time range',
    'map.loading': 'Loading map data...',
    'map.coordinates': 'Coordinates',
    'map.scale': 'Scale',
    
    // Search
    'search.placeholder': 'Search albums...',
    'search.noResults': 'No albums found',
    'search.results': 'results',
    
    // Layer control
    'layer.vector': 'Vector Map',
    'layer.satellite': 'Satellite',
    
    // Date filter
    'date.startDate': 'Start Date',
    'date.endDate': 'End Date',
    'date.reset': 'Reset',
    'date.showing': 'Showing',
    'date.of': 'of',
    'date.albums': 'albums',
    
    // Album
    'album.title': 'Title',
    'album.description': 'Description',
    'album.photos': 'photos',
    'album.create': 'Create',
    'album.cancel': 'Cancel',
    'album.edit': 'Edit',
    'album.delete': 'Delete',
    'album.save': 'Save',
    'album.titlePlaceholder': 'Album Title',
    'album.descriptionPlaceholder': 'Add album description...',
    'album.noDescription': 'No description',
    'album.noPhotos': 'No photos',
    'album.noPhotosHint': 'Click upload button to add photos',
    'album.loadingPhotos': 'Loading photos...',
    'album.coordinates': 'Coordinates',
    'album.nextDestination': 'Next Destination',
    'album.setNextDestination': 'Set Next Destination',
    'album.modifyNextDestination': 'Modify Next Destination',
    'album.uploadPhoto': 'Upload Photo',
    'album.editAlbum': 'Edit Album',
    'album.deleteAlbum': 'Delete Album',
    'album.retry': 'Retry',
    'album.loadPhotosFailed': 'Failed to load photos',
    'album.saveFailed': 'Failed to save',
    'album.deletePhotoFailed': 'Failed to delete photo',
    'album.deleteAlbumFailed': 'Failed to delete album',
    'album.deletePasswordError': 'Please enter "delete" to confirm',
    'album.confirmDeleteAlbum': 'Confirm Delete Album',
    'album.confirmDeletePhoto': 'Confirm Delete Photo',
    'album.deleteAlbumWarning': 'Deleting the album will also delete all photos. This action cannot be undone. Please enter',
    'album.deleteAlbumWarning2': 'to confirm.',
    'album.deletePhotoWarning': 'Are you sure you want to delete this photo? This action cannot be undone.',
    'album.deletePasswordPlaceholder': 'Enter "delete" to confirm',
    'album.deleting': 'Deleting...',
    'album.confirmDelete': 'Confirm Delete',
    
    // Common
    'common.error': 'Error',
    'common.success': 'Success',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'zh') ? saved : 'zh';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key as keyof typeof translations.zh] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

// Export for fast refresh compatibility
export default LanguageProvider;
