import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{username?: string; password?: string; confirmPassword?: string}>({});
  
  const { register, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Client-side validation
    const errors: {username?: string; password?: string; confirmPassword?: string} = {};
    
    if (!username.trim()) {
      errors.username = '请输入用户名';
    } else if (username.trim().length < 3) {
      errors.username = '用户名至少需要3个字符';
    } else if (username.trim().length > 50) {
      errors.username = '用户名不能超过50个字符';
    }

    if (!password) {
      errors.password = '请输入密码';
    } else if (password.length < 6) {
      errors.password = '密码至少需要6个字符';
    }

    if (!confirmPassword) {
      errors.confirmPassword = '请确认密码';
    } else if (password && password !== confirmPassword) {
      errors.confirmPassword = '密码不匹配';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      await register(username.trim(), password);
      // Navigation will be handled by the redirect above
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            创建 GeoAlbum 账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或者{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              登录已有账户
            </Link>
          </p>
        </div>
        <form className="mt-6 sm:mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-3 sm:p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-3 sm:py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base sm:text-sm ${
                  fieldErrors.username ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="用户名 (至少3个字符)"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) {
                    setFieldErrors(prev => ({ ...prev, username: undefined }));
                  }
                }}
                disabled={isLoading}
                minLength={3}
                maxLength={50}
              />
              {fieldErrors.username && (
                <div className="text-red-600 text-xs mt-1 px-3">{fieldErrors.username}</div>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-3 sm:py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base sm:text-sm ${
                  fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="密码 (至少6个字符)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors(prev => ({ ...prev, password: undefined }));
                  }
                }}
                disabled={isLoading}
                minLength={6}
              />
              {fieldErrors.password && (
                <div className="text-red-600 text-xs mt-1 px-3">{fieldErrors.password}</div>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-3 sm:py-2 border placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base sm:text-sm ${
                  fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                disabled={isLoading}
              />
              {fieldErrors.confirmPassword && (
                <div className="text-red-600 text-xs mt-1 px-3">{fieldErrors.confirmPassword}</div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent text-base sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '注册中...' : '创建账户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;