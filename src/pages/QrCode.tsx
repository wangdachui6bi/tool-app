import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';
import './QrCode.css';

export default function QrCode() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const url = await QRCode.toDataURL(trimmed, {
        width: 280,
        margin: 2,
        color: { dark: '#1E293B', light: '#FFFFFF' },
      });
      setDataUrl(url);
    } catch {
      setDataUrl(null);
    }
  };

  const handleSave = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'qrcode.png';
    link.click();
  };

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">二维码</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab qrcode-content">
        <textarea
          className="qrcode-textarea"
          placeholder="输入文字或网址"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />

        <button
          className="qrcode-gen-btn"
          onClick={handleGenerate}
          disabled={!text.trim()}
        >
          生成二维码
        </button>

        {dataUrl && (
          <div className="qrcode-result fade-in">
            <div className="qrcode-card">
              <img src={dataUrl} alt="QR Code" className="qrcode-img" />
            </div>
            <button className="qrcode-save-btn" onClick={handleSave}>
              保存图片
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
