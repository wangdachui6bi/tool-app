import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, UserCircle } from 'lucide-react';
import './BmiCalc.css';

const BMI_CATEGORIES = [
  { min: 0, max: 18.5, label: '偏瘦', color: '#3B82F6' },
  { min: 18.5, max: 24, label: '正常', color: 'var(--success)' },
  { min: 24, max: 28, label: '超重', color: 'var(--warning)' },
  { min: 28, max: Infinity, label: '肥胖', color: 'var(--danger)' },
];

function getCategory(bmi: number) {
  return BMI_CATEGORIES.find(c => bmi >= c.min && bmi < c.max) ?? BMI_CATEGORIES[3];
}

export default function BmiCalc() {
  const navigate = useNavigate();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [result, setResult] = useState<{ bmi: number; category: typeof BMI_CATEGORIES[0] } | null>(null);

  const handleCalculate = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) return;
    const heightM = h / 100;
    const bmi = w / (heightM * heightM);
    setResult({ bmi, category: getCategory(bmi) });
  };

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">BMI计算器</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab">
        <div className="bmi-form fade-in">
          <div className="bmi-input-group">
            <label className="bmi-label">身高 (cm)</label>
            <input
              type="number"
              className="bmi-input"
              placeholder="170"
              value={height}
              onChange={e => setHeight(e.target.value)}
              min={50}
              max={250}
              step={0.1}
            />
          </div>
          <div className="bmi-input-group">
            <label className="bmi-label">体重 (kg)</label>
            <input
              type="number"
              className="bmi-input"
              placeholder="65"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              min={20}
              max={300}
              step={0.1}
            />
          </div>
          <div className="bmi-gender">
            <label className="bmi-label">性别</label>
            <div className="bmi-gender-toggle">
              <button
                className={`bmi-gender-btn ${gender === 'male' ? 'active' : ''}`}
                onClick={() => setGender('male')}
              >
                <User size={20} />
                <span>男</span>
              </button>
              <button
                className={`bmi-gender-btn ${gender === 'female' ? 'active' : ''}`}
                onClick={() => setGender('female')}
              >
                <UserCircle size={20} />
                <span>女</span>
              </button>
            </div>
          </div>
          <button
            className="bmi-calc-btn"
            onClick={handleCalculate}
            disabled={!height || !weight}
          >
            计算
          </button>

          {result && (
            <div className="bmi-result-card fade-in" style={{ borderColor: result.category.color }}>
              <div className="bmi-result-value" style={{ color: result.category.color }}>
                {result.bmi.toFixed(1)}
              </div>
              <div className="bmi-result-label">BMI</div>
              <div className="bmi-result-category" style={{ color: result.category.color }}>
                {result.category.label}
              </div>
            </div>
          )}

          <div className="bmi-reference card">
            <div className="bmi-reference-title">BMI 参考范围</div>
            <div className="bmi-reference-list">
              {BMI_CATEGORIES.map(c => (
                <div key={c.label} className="bmi-reference-item">
                  <span className="bmi-ref-dot" style={{ background: c.color }} />
                  <span className="bmi-ref-range">
                    {c.max === Infinity ? `≥${c.min}` : `${c.min}-${c.max}`}
                  </span>
                  <span className="bmi-ref-label">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
