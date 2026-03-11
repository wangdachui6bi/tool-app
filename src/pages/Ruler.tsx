import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ruler as RulerIcon } from 'lucide-react';
import './Ruler.css';

const CM_PX = 37.8;
const INCH_PX = 96;
const RULER_LENGTH_CM = 50;
const RULER_LENGTH_IN = 20;

export default function Ruler() {
  const navigate = useNavigate();
  const [primary, setPrimary] = useState<'cm' | 'inch'>('cm');

  const cmMarks = [];
  for (let i = 0; i <= RULER_LENGTH_CM; i++) {
    cmMarks.push(
      <div key={i} className="ruler-cm-mark" style={{ top: i * CM_PX }}>
        {i > 0 && <span className="ruler-cm-label">{i}</span>}
      </div>
    );
  }

  const inchMarks = [];
  for (let i = 0; i <= RULER_LENGTH_IN; i++) {
    inchMarks.push(
      <div key={i} className="ruler-inch-mark" style={{ top: i * INCH_PX }}>
        {i > 0 && <span className="ruler-inch-label">{i}</span>}
      </div>
    );
  }

  return (
    <div className="page ruler-page">
      <div className="add-nav ruler-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">尺子</span>
        <button
          className="ruler-toggle"
          onClick={() => setPrimary(p => p === 'cm' ? 'inch' : 'cm')}
        >
          <RulerIcon size={20} />
          <span>{primary === 'cm' ? '英寸' : '厘米'}</span>
        </button>
      </div>

      <div className="ruler-container">
        <div
          className="ruler-track"
          style={{ height: Math.max(RULER_LENGTH_CM * CM_PX, RULER_LENGTH_IN * INCH_PX) }}
        >
          <div className={`ruler-side ruler-left ${primary === 'cm' ? 'ruler-primary' : 'ruler-secondary'}`}>
            <div className="ruler-mm-ticks" />
            <div className="ruler-5mm-ticks" />
            <div className="ruler-cm-ticks" />
            {cmMarks}
          </div>
          <div className={`ruler-side ruler-right ${primary === 'inch' ? 'ruler-primary' : 'ruler-secondary'}`}>
            <div className="ruler-inch-ticks" />
            <div className="ruler-inch-4ticks" />
            <div className="ruler-inch-1ticks" />
            {inchMarks}
          </div>
        </div>
      </div>
    </div>
  );
}
