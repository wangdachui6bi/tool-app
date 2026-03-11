import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './TaxCalc.css';

const TAX_BRACKETS = [
  { min: 0, max: 3000, rate: 0.03, deduction: 0 },
  { min: 3000, max: 12000, rate: 0.10, deduction: 210 },
  { min: 12000, max: 25000, rate: 0.20, deduction: 1410 },
  { min: 25000, max: 35000, rate: 0.25, deduction: 2660 },
  { min: 35000, max: 55000, rate: 0.30, deduction: 4410 },
  { min: 55000, max: 80000, rate: 0.35, deduction: 7160 },
  { min: 80000, max: Infinity, rate: 0.45, deduction: 15160 },
];

const THRESHOLD = 5000;

function calcTax(taxable: number): { tax: number; rate: number } {
  if (taxable <= 0) return { tax: 0, rate: 0 };
  const bracket = TAX_BRACKETS.find(b => taxable > b.min && taxable <= b.max)
    ?? TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const tax = taxable * bracket.rate - bracket.deduction;
  return { tax: Math.max(0, tax), rate: bracket.rate };
}

export default function TaxCalc() {
  const navigate = useNavigate();
  const [salary, setSalary] = useState('');
  const [insurance, setInsurance] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [result, setResult] = useState<{
    taxable: number;
    tax: number;
    rate: number;
    afterTax: number;
  } | null>(null);

  const handleCalculate = () => {
    const s = parseFloat(salary) || 0;
    const ins = parseFloat(insurance) || 0;
    const ded = parseFloat(deductions) || 0;
    const taxable = Math.max(0, s - ins - THRESHOLD - ded);
    const { tax, rate } = calcTax(taxable);
    const afterTax = s - ins - tax;
    setResult({ taxable, tax, rate, afterTax });
  };

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">个税计算器</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab">
        <div className="tax-form fade-in">
          <div className="tax-input-group">
            <label className="tax-label">税前月薪 (元)</label>
            <input
              type="number"
              className="tax-input"
              placeholder="15000"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              min={0}
              step={100}
            />
          </div>
          <div className="tax-input-group">
            <label className="tax-label">五险一金 (元)</label>
            <input
              type="number"
              className="tax-input"
              placeholder="0"
              value={insurance}
              onChange={e => setInsurance(e.target.value)}
              min={0}
              step={100}
            />
          </div>
          <div className="tax-input-group">
            <label className="tax-label">专项附加扣除 (元)</label>
            <input
              type="number"
              className="tax-input"
              placeholder="0"
              value={deductions}
              onChange={e => setDeductions(e.target.value)}
              min={0}
              step={100}
            />
          </div>
          <div className="tax-threshold">起征点 5000元/月</div>
          <button
            className="tax-calc-btn"
            onClick={handleCalculate}
            disabled={!salary}
          >
            计算
          </button>

          {result && (
            <div className="tax-result-card fade-in">
              <div className="tax-result-row">
                <span className="tax-result-label">应纳税所得额</span>
                <span className="tax-result-value">{result.taxable.toLocaleString()} 元</span>
              </div>
              <div className="tax-result-row">
                <span className="tax-result-label">适用税率</span>
                <span className="tax-result-value">{(result.rate * 100).toFixed(0)}%</span>
              </div>
              <div className="tax-result-row">
                <span className="tax-result-label">应缴个税</span>
                <span className="tax-result-value tax-highlight">{result.tax.toFixed(2)} 元</span>
              </div>
              <div className="tax-result-row tax-result-main">
                <span className="tax-result-label">税后月薪</span>
                <span className="tax-result-value tax-result-large">{result.afterTax.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元</span>
              </div>
            </div>
          )}

          <div className="tax-reference card">
            <div className="tax-reference-title">税率表 (累计预扣预缴)</div>
            <div className="tax-table">
              <div className="tax-table-header">
                <span>级数</span>
                <span>应纳税所得额</span>
                <span>税率</span>
                <span>速算扣除</span>
              </div>
              {TAX_BRACKETS.map((b, i) => (
                <div key={i} className="tax-table-row">
                  <span>{i + 1}</span>
                  <span>{b.max === Infinity ? `>${b.min.toLocaleString()}` : `${b.min.toLocaleString()}-${b.max.toLocaleString()}`}</span>
                  <span>{(b.rate * 100).toFixed(0)}%</span>
                  <span>{b.deduction}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
