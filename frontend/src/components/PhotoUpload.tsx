import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { apiClient } from '../services/api';

interface PhotoUploadProps {
  albumId: string;
  onUploadComplete: (uploadedPhotos: any[]) => void;
  onClose: () => void;
  className?: string;
}

interface UploadFile {
  file: File;
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  albumId,
  onUploadComplete,
  onClose,
  className = '',
}) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supported file types
  const supportedTypes = ['image/jpeg', 'image/png', 'image/heic'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!supportedTypes.includes(file.type)) {
      return '不支持的文件格式。请选择 JPEG、PNG 或 HEIC 格式的图片。';
    }
    
    if (file.size > maxFileSize) {
      return '文件大小超过限制。请选择小于 10MB 的图片。';
    }
    
    return null;
  };

  const createUploadFile = (file: File): UploadFile => {
    const id = Math.random().toString(36).substr(2, 9);
    const preview = URL.createObjectURL(file);
    
    return {
      file,
      id,
      preview,
      status: 'pending',
      progress: 0,
    };
  };

  const addFiles = useCallback((files: File[]) => {
    const newUploadFiles: UploadFile[] = [];
    
    files.forEach((file) => {
      const error = validateFile(file);
      const uploadFile = createUploadFile(file);
      
      if (error) {
        uploadFile.status = 'error';
        uploadFile.error = error;
      }
      
      newUploadFiles.push(uploadFile);
    });
    
    setUploadFiles((prev) => [...prev, ...newUploadFiles]);
  }, []);

  const removeFile = (id: string) => {
    setUploadFiles((prev) => {
      const file = prev.find(f => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleUploadFiles = async () => {
    const validFiles = uploadFiles.filter(f => f.status === 'pending');
    if (validFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      // Update status to uploading
      setUploadFiles(prev => 
        prev.map(f => 
          f.status === 'pending' 
            ? { ...f, status: 'uploading' as const, progress: 0 }
            : f
        )
      );

      // Upload files
      const filesToUpload = validFiles.map(f => f.file);
      
      // Simulate progress updates (since we can't track real progress with current API)
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => 
          prev.map(f => 
            f.status === 'uploading' 
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);

      const uploadedPhotos = await apiClient.uploadPhotos(albumId, filesToUpload);
      
      clearInterval(progressInterval);
      
      // Update status to success
      setUploadFiles(prev => 
        prev.map(f => 
          f.status === 'uploading' 
            ? { ...f, status: 'success' as const, progress: 100 }
            : f
        )
      );

      // Call completion callback
      onUploadComplete(uploadedPhotos);
      
      // Close after a short delay to show success state
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      // Update status to error
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      setUploadFiles(prev => 
        prev.map(f => 
          f.status === 'uploading' 
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = uploadFiles.some(f => f.status === 'pending') && !isUploading;
  const hasErrors = uploadFiles.some(f => f.status === 'error');
  const allSuccess = uploadFiles.length > 0 && uploadFiles.every(f => f.status === 'success');

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">上传照片</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <div className="mb-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                点击选择文件
              </button>
              <span className="text-gray-500"> 或拖拽文件到此处</span>
            </div>
            <p className="text-sm text-gray-500">
              支持 JPEG、PNG、HEIC 格式，单个文件最大 10MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/heic"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                选中的文件 ({uploadFiles.length})
              </h3>
              <div className="space-y-2">
                {uploadFiles.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Preview */}
                    <div className="w-12 h-12 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                      <img
                        src={uploadFile.preview}
                        alt={uploadFile.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {uploadFile.file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      
                      {/* Progress Bar */}
                      {uploadFile.status === 'uploading' && (
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {uploadFile.status === 'error' && uploadFile.error && (
                        <div className="text-xs text-red-500 mt-1">
                          {uploadFile.error}
                        </div>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      {uploadFile.status === 'uploading' && (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                      {uploadFile.status === 'pending' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {uploadFiles.length > 0 && (
              <>
                {uploadFiles.filter(f => f.status === 'success').length} / {uploadFiles.length} 已完成
                {hasErrors && (
                  <span className="text-red-500 ml-2">
                    {uploadFiles.filter(f => f.status === 'error').length} 个文件失败
                  </span>
                )}
              </>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              {allSuccess ? '完成' : '取消'}
            </button>
            
            {canUpload && (
              <button
                onClick={handleUploadFiles}
                disabled={!canUpload}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>开始上传</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;