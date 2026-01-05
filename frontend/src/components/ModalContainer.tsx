import React from 'react';

interface ModalContainerProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  transparent?: boolean; // 是否使用透明背景
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  variant?: 'default' | 'form' | 'gallery' | 'selector' | 'upload'; // 模态框类型
  maxHeight?: string; // 自定义最大高度
}

const ModalContainer: React.FC<ModalContainerProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  overlayClassName = '',
  contentClassName = '',
  transparent = false,
  size = 'md',
  closeOnOverlayClick = true,
  variant = 'default',
  maxHeight,
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  // 根据变体类型设置不同的样式
  const getVariantStyles = () => {
    switch (variant) {
      case 'form':
        return {
          overlay: 'bg-black/60 backdrop-blur-sm',
          content: 'bg-white shadow-2xl border border-gray-200/50',
          maxHeight: maxHeight || 'max-h-[85vh]',
        };
      case 'gallery':
        return {
          overlay: 'bg-black/80 backdrop-blur-md',
          content: 'bg-white/95 backdrop-blur-sm shadow-2xl',
          maxHeight: maxHeight || 'max-h-[90vh]',
        };
      case 'selector':
        return {
          overlay: 'bg-black/50 backdrop-blur-sm',
          content: 'bg-white/98 backdrop-blur-md shadow-xl border border-gray-200/30',
          maxHeight: maxHeight || 'max-h-[80vh]',
        };
      case 'upload':
        return {
          overlay: 'bg-black/60 backdrop-blur-sm',
          content: 'bg-white/96 backdrop-blur-sm shadow-xl border border-gray-200/40',
          maxHeight: maxHeight || 'max-h-[85vh]',
        };
      default:
        return {
          overlay: transparent ? 'bg-black/20 backdrop-blur-sm' : 'bg-black/50',
          content: transparent ? 'bg-white/95 backdrop-blur-sm' : 'bg-white',
          maxHeight: maxHeight || 'max-h-[90vh]',
        };
    }
  };

  const variantStyles = getVariantStyles();

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${variantStyles.overlay} ${overlayClassName} ${className}`}
      onClick={handleOverlayClick}
    >
      <div 
        className={`${variantStyles.content} rounded-lg w-full ${sizeClasses[size]} ${variantStyles.maxHeight} overflow-hidden flex flex-col ${contentClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default ModalContainer;