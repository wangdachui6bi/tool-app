import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, LineChart, RefreshCw } from 'lucide-react';
import './StockAssistant.css';

const STOCK_URL = 'http://111.229.151.210:3001/';

export default function StockAssistant() {
  const navigate = useNavigate();
  const [frameKey, setFrameKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setShowFallback(false);

    const timer = window.setTimeout(() => {
      setShowFallback(true);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [frameKey]);

  const openExternal = () => {
    window.open(STOCK_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="page stock-assistant-page">
      <div className="stock-header">
        <div className="stock-header-top">
          <button className="stock-icon-btn" onClick={() => navigate(-1)} aria-label="返回">
            <ChevronLeft size={20} />
          </button>
          <div className="stock-header-actions">
            <button
              className="stock-icon-btn"
              onClick={() => setFrameKey((value) => value + 1)}
              aria-label="刷新"
            >
              <RefreshCw size={18} />
            </button>
            <button className="stock-open-btn" onClick={openExternal}>
              外部打开
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

        <div className="stock-hero">
          <div className="stock-hero-icon">
            <LineChart size={24} />
          </div>
          <div className="stock-hero-copy">
            <div className="stock-hero-title-row">
              <h1 className="stock-hero-title">股票助手</h1>
              <span className="stock-status-chip">
                {isLoading ? '连接中' : '已连接'}
              </span>
            </div>
            <p className="stock-hero-subtitle">
              {Capacitor.isNativePlatform()
                ? '已针对 App WebView 做兼容优化，若加载较慢可直接外部打开。'
                : '内嵌访问交易页面，支持快速查看与跳转。'}
            </p>
          </div>
        </div>
      </div>

      <div className="page-content no-tab stock-page-content">
        <div className="stock-webview-shell">
          {isLoading && (
            <div className="stock-loading">
              <div className="stock-spinner" />
              <p>正在连接股票服务...</p>
            </div>
          )}

          {showFallback && (
            <div className="stock-hint-card">
              <div>
                <strong>页面加载较慢？</strong>
                <p>已放宽 App 侧 WebView 限制，你也可以尝试刷新或改为外部打开。</p>
              </div>
              <div className="stock-hint-actions">
                <button className="stock-secondary-btn" onClick={() => setFrameKey((value) => value + 1)}>
                  重新加载
                </button>
                <button className="stock-primary-btn" onClick={openExternal}>
                  外部打开
                </button>
              </div>
            </div>
          )}

          <iframe
            key={frameKey}
            src={STOCK_URL}
            className={`stock-webview ${isLoading ? 'is-loading' : ''}`}
            title="股票助手"
            allow="clipboard-read; clipboard-write; fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}
