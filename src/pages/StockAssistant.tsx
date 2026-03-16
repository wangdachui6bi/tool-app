import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import './StockAssistant.css';

export default function StockAssistant() {
  const navigate = useNavigate();

  return (
    <div className="page stock-assistant-page">
      <div className="nav-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <div className="nav-title">股票助手</div>
        <div className="w-6" />
      </div>
      <div className="page-content p-0">
        <iframe 
          src="http://111.229.151.210:3001/" 
          className="stock-webview"
          title="股票助手"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
