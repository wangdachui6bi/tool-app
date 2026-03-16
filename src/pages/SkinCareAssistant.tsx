import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowLeft, Camera, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Clock3,
  Copy, Flame, ShieldPlus, Sparkles, TriangleAlert, TrendingUp,
} from 'lucide-react';
import {
  createEmptySkinRecord,
  getSkinCareRecordByDate,
  getSkinCareRecords,
  saveSkinCareRecord,
  type SkinCareRecord,
  type SkinCareRoutine,
} from '../stores/skinCareStore';
import './SkinCareAssistant.css';

const LEVEL_LABELS = ['无', '轻', '中', '明显', '很重'];
const TRIGGERS = ['出汗闷热', '紧身衣物', '摩擦背包', '新沐浴产品', '熬夜压力', '高糖高奶', '经期波动'];

const ROUTINE_ITEMS: { key: keyof SkinCareRoutine; label: string; hint: string }[] = [
  { key: 'showerAfterSweat', label: '出汗后尽快冲洗', hint: '减少汗液和摩擦残留' },
  { key: 'changedClothes', label: '更换宽松衣物', hint: '避免闷热和摩擦' },
  { key: 'benzoylWash', label: '按计划使用清洁', hint: '如已在用过氧化苯甲酰类身体清洁' },
  { key: 'avoidPicking', label: '今天没有抠挤', hint: '减少破溃和色沉' },
  { key: 'cleanBedding', label: '本周已换床品', hint: '尤其枕巾和贴身衣物' },
];

function getRoutineScore(record: SkinCareRecord): number {
  const done = ROUTINE_ITEMS.filter((item) => record.routine[item.key]).length;
  return Math.round((done / ROUTINE_ITEMS.length) * 100);
}

function getSeverityScore(record: SkinCareRecord): number {
  return record.bumpLevel * 3 + record.itchLevel + record.painLevel * 2 + record.rednessLevel * 2
    + (record.pus ? 3 : 0) + (record.spreading ? 4 : 0) + (record.rapidWorsening ? 5 : 0) + (record.fever ? 6 : 0);
}

function getTrendLabel(current: SkinCareRecord, previous?: SkinCareRecord): string {
  if (!previous) return '今天先建立基线';
  const diff = getSeverityScore(current) - getSeverityScore(previous);
  if (diff <= -3) return '相比上次在变轻';
  if (diff >= 3) return '相比上次在加重';
  return '相比上次变化不大';
}

function getDoctorGuidance(record: SkinCareRecord, history: SkinCareRecord[]): string {
  const worseningDays = history.slice(0, 7).filter((item) => item.rapidWorsening || item.spreading).length;
  if (record.fever || record.spreading || record.painLevel >= 3 || record.rapidWorsening) {
    return '今天更适合尽快就医，尤其是出现发热、明显疼痛、范围扩散或突然加重时。';
  }
  if (record.pus && record.bumpLevel >= 3) {
    return '如果脓疱较多或反复发，建议预约皮肤科确认是否为细菌或真菌性毛囊炎。';
  }
  if (worseningDays >= 3 || history.length >= 14) {
    return '如果已经认真护理 2 到 4 周仍反复，建议带着记录和照片去看皮肤科。';
  }
  return '先坚持 1 到 2 周同一套护理与记录，重点观察是否减少、是否更痒或更痛。';
}

function getDecisionState(record: SkinCareRecord, history: SkinCareRecord[]): 'urgent' | 'soon' | 'observe' {
  const worseningDays = history.slice(0, 7).filter((item) => item.rapidWorsening || item.spreading).length;
  if (record.fever || record.spreading || record.painLevel >= 3 || record.rapidWorsening) return 'urgent';
  if ((record.pus && record.bumpLevel >= 3) || worseningDays >= 3 || history.length >= 14) return 'soon';
  return 'observe';
}

function getCaregiverSummary(record: SkinCareRecord, history: SkinCareRecord[]): string[] {
  const previous = history.find((item) => item.date !== record.date);
  const lines = [
    `最近观察到背部疹子/痘痘程度为${LEVEL_LABELS[record.bumpLevel]}`,
    `痒 ${LEVEL_LABELS[record.itchLevel]}，痛 ${LEVEL_LABELS[record.painLevel]}，红 ${LEVEL_LABELS[record.rednessLevel]}`,
  ];

  if (record.pus) lines.push('有明显脓疱表现');
  if (record.spreading) lines.push('范围有扩散趋势');
  if (record.rapidWorsening) lines.push('近两天突然加重');
  if (record.triggers.length) lines.push(`怀疑诱因包括：${record.triggers.join('、')}`);
  if (previous) lines.push(`与上一次相比：${getTrendLabel(record, previous)}`);

  return lines;
}

function hasMeaningfulRecord(record: SkinCareRecord): boolean {
  return (
    record.notes.trim().length > 0 ||
    record.photos.length > 0 ||
    record.triggers.length > 0 ||
    record.pus ||
    record.spreading ||
    record.fever ||
    record.rapidWorsening ||
    record.itchLevel > 0 ||
    record.painLevel > 0 ||
    record.rednessLevel > 1 ||
    record.bumpLevel !== 2 ||
    getRoutineScore(record) > 0
  );
}

function buildWeeklySummary(history: SkinCareRecord[]): string {
  const recent = [...history].slice(0, 7).reverse();
  if (recent.length === 0) return '最近 7 天还没有记录。';

  return recent.map((item) => {
    const flags = [
      `疹子/痘痘${LEVEL_LABELS[item.bumpLevel]}`,
      `痒${LEVEL_LABELS[item.itchLevel]}`,
      `痛${LEVEL_LABELS[item.painLevel]}`,
      `红${LEVEL_LABELS[item.rednessLevel]}`,
      item.pus ? '有脓疱' : '',
      item.spreading ? '有扩散' : '',
      item.rapidWorsening ? '突然加重' : '',
      item.triggers.length ? `诱因:${item.triggers.join('、')}` : '',
    ].filter(Boolean);

    return `${dayjs(item.date).format('M月D日')}：${flags.join('，')}`;
  }).join('\n');
}

function getWeekOverWeekSummary(history: SkinCareRecord[]): string {
  const ordered = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const currentWeek = ordered.slice(-7);
  const previousWeek = ordered.slice(-14, -7);

  if (currentWeek.length < 3 || previousWeek.length < 3) {
    return '记录还不够两周，先继续坚持，后面这里会自动判断本周和上周谁更轻。';
  }

  const avg = (items: SkinCareRecord[]) =>
    items.reduce((sum, item) => sum + getSeverityScore(item), 0) / items.length;

  const currentAvg = avg(currentWeek);
  const previousAvg = avg(previousWeek);
  const diff = currentAvg - previousAvg;

  if (diff <= -2) return '本周整体比上周更轻，说明当前护理方向可能是对的。';
  if (diff >= 2) return '本周整体比上周更重，建议尽快复盘诱因或准备就医。';
  return '本周和上周差不多，说明现在的护理效果还不够明确。';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SkinCareAssistant() {
  const navigate = useNavigate();
  const today = dayjs().format('YYYY-MM-DD');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [record, setRecord] = useState<SkinCareRecord>(createEmptySkinRecord(today));
  const [history, setHistory] = useState<SkinCareRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const loadData = useCallback(async () => {
    const [todayRecord, allRecords] = await Promise.all([
      getSkinCareRecordByDate(today),
      getSkinCareRecords(),
    ]);
    setRecord(todayRecord);
    setHistory(allRecords);
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const previousRecord = history.find((item) => item.date !== today);
  const recentRecords = useMemo(
    () => [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
    [history]
  );
  const routineScore = useMemo(() => getRoutineScore(record), [record]);
  const severityScore = useMemo(() => getSeverityScore(record), [record]);
  const trendLabel = useMemo(() => getTrendLabel(record, previousRecord), [previousRecord, record]);
  const doctorGuidance = useMemo(() => getDoctorGuidance(record, history), [history, record]);
  const decisionState = useMemo(() => getDecisionState(record, history), [history, record]);
  const caregiverSummary = useMemo(() => getCaregiverSummary(record, history), [history, record]);
  const savedToday = useMemo(() => hasMeaningfulRecord(record), [record]);
  const adherenceDays = useMemo(
    () => recentRecords.filter((item) => getRoutineScore(item) >= 60).length,
    [recentRecords]
  );
  const photoTimeline = useMemo(
    () => recentRecords.filter((item) => item.photos.length > 0).slice(-4),
    [recentRecords]
  );
  const comparePhotos = useMemo(() => [...photoTimeline].slice(-2), [photoTimeline]);
  const weeklySummary = useMemo(() => buildWeeklySummary(history), [history]);
  const weekOverWeekSummary = useMemo(() => getWeekOverWeekSummary(history), [history]);

  const saveRecord = async (nextRecord = record) => {
    setSaving(true);
    await saveSkinCareRecord(nextRecord);
    await loadData();
    setSaving(false);
  };

  const updateField = <K extends keyof SkinCareRecord>(key: K, value: SkinCareRecord[K]) => {
    setRecord((prev) => ({ ...prev, [key]: value }));
  };

  const updateRoutine = (key: keyof SkinCareRoutine) => {
    setRecord((prev) => ({
      ...prev,
      routine: {
        ...prev.routine,
        [key]: !prev.routine[key],
      },
    }));
  };

  const toggleTrigger = (trigger: string) => {
    setRecord((prev) => ({
      ...prev,
      triggers: prev.triggers.includes(trigger)
        ? prev.triggers.filter((item) => item !== trigger)
        : [...prev.triggers, trigger],
    }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 2);
    if (!files.length) return;
    const photos = await Promise.all(files.map(readFileAsDataUrl));
    setRecord((prev) => ({
      ...prev,
      photos: [...photos, ...prev.photos].slice(0, 6),
    }));
    event.target.value = '';
  };

  const handleSave = async () => {
    await saveRecord();
  };

  const handleCopySummary = async () => {
    await navigator.clipboard.writeText(weeklySummary);
  };

  const handleQuickMark = async (type: 'stable' | 'worse') => {
    const nextRecord: SkinCareRecord =
      type === 'stable'
        ? {
            ...record,
            rapidWorsening: false,
            updatedAt: new Date().toISOString(),
          }
        : {
            ...record,
            rapidWorsening: true,
            rednessLevel: Math.min(4, record.rednessLevel + 1),
            updatedAt: new Date().toISOString(),
          };

    setRecord(nextRecord);
    await saveRecord(nextRecord);
  };

  return (
    <div className="page skin-care-page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">皮肤护理助手</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab skin-care-content">
        {decisionState !== 'observe' && (
          <div className={`skin-alert-strip ${decisionState}`}>
            <TriangleAlert size={18} />
            <div>
              <strong>{decisionState === 'urgent' ? '今天有高风险信号' : '这周建议提高警惕'}</strong>
              <span>
                {decisionState === 'urgent'
                  ? '已经出现需要尽快就医的信号，别只靠继续观察。'
                  : '如果继续反复或加重，建议尽快安排皮肤科。'}
              </span>
            </div>
          </div>
        )}

        <div className="skin-hero fade-in">
          <div className="skin-hero-badge">
            <ShieldPlus size={22} />
            <span>你来帮她连续观察，不替代医生诊断</span>
          </div>
          <h1>帮她把变化看清楚，才更容易好起来</h1>
          <p>
            你最有价值的不是猜病名，而是固定拍照、记录变化、减少诱因，
            持续 1 到 2 周后再判断是继续护理还是尽快就医。
          </p>
        </div>

        <div className="skin-summary-grid">
          <div className="skin-summary-card">
            <div className="skin-summary-icon severity"><Flame size={20} /></div>
            <div>
              <div className="skin-summary-label">今天严重度</div>
              <div className="skin-summary-value">{severityScore}</div>
              <div className="skin-summary-sub">{LEVEL_LABELS[Math.min(4, Math.floor(record.bumpLevel))]}为主</div>
            </div>
          </div>
          <div className="skin-summary-card">
            <div className="skin-summary-icon routine"><CheckCircle2 size={20} /></div>
            <div>
              <div className="skin-summary-label">你今天帮她做到的护理</div>
              <div className="skin-summary-value">{routineScore}%</div>
              <div className="skin-summary-sub">执行越稳定，越容易判断有没有真正改善</div>
            </div>
          </div>
          <div className="skin-summary-card">
            <div className="skin-summary-icon trend"><Sparkles size={20} /></div>
            <div>
              <div className="skin-summary-label">你这次观察到</div>
              <div className="skin-summary-value skin-trend">{trendLabel}</div>
              <div className="skin-summary-sub">和你上一次帮她记录对比</div>
            </div>
          </div>
        </div>

        <div className={`skin-reminder-card ${savedToday ? 'done' : 'pending'}`}>
          <div>
            <div className="skin-reminder-title">
              {savedToday ? '今晚这次已经帮她记录过了' : '今晚还没帮她完成记录'}
            </div>
            <div className="skin-reminder-copy">
              {savedToday
                ? '记得明天继续固定角度拍照，连续 7 到 14 天最有判断价值。'
                : '最好在晚上洗澡后或固定光线下补一张照片，再把今天变化记下来。'}
            </div>
          </div>
          <div className="skin-reminder-badge">
            {savedToday ? '已完成' : '待处理'}
          </div>
        </div>

        <div className="skin-quick-card">
          <div className="skin-quick-head">
            <div>
              <div className="skin-quick-title">30 秒极速记录</div>
              <div className="skin-quick-copy">赶时间时，先把今天是“差不多”还是“明显更糟”记下来。</div>
            </div>
          </div>
          <div className="skin-quick-actions">
            <button className="skin-quick-btn neutral" onClick={() => handleQuickMark('stable')}>
              今天差不多
            </button>
            <button className="skin-quick-btn danger" onClick={() => handleQuickMark('worse')}>
              今天更糟了
            </button>
          </div>
        </div>

        <div className="skin-caregiver-card">
          <div className="skin-caregiver-head">
            <Camera size={18} />
            <span>你今天最值得做的 3 件事</span>
          </div>
          <div className="skin-caregiver-steps">
            <div className="skin-caregiver-step">
              <strong>1. 固定角度拍照</strong>
              <span>同一光线、同一距离、同一角度，比多拍更有价值。</span>
            </div>
            <div className="skin-caregiver-step">
              <strong>2. 只记录变化</strong>
              <span>比昨天更红、更痒、更痛、更多脓疱没有，这些最关键。</span>
            </div>
            <div className="skin-caregiver-step">
              <strong>3. 帮她避开诱因</strong>
              <span>闷汗、摩擦、抠挤、频繁乱换产品，通常比你想的更影响恢复。</span>
            </div>
          </div>
        </div>

        <div className={`skin-decision-card ${decisionState}`}>
          <div className="skin-decision-title">
            <TriangleAlert size={18} />
            {decisionState === 'urgent' ? '今天更建议尽快看皮肤科' : decisionState === 'soon' ? '建议准备就医评估' : '目前可以先继续观察护理'}
          </div>
          <div className="skin-decision-copy">
            {decisionState === 'urgent'
              ? '因为已经出现发热、明显疼痛、扩散或突然加重中的高风险信号，继续拖延意义不大。'
              : decisionState === 'soon'
                ? '说明它可能不是普通的“自己会好”，尤其是脓疱多、反复发或认真护理后还是不见好。'
                : '先把护理动作和拍照记录做稳，最怕的是护理天天换、照片也不固定，最后无法判断到底有没有好转。'}
          </div>
        </div>

        <div className="skin-panel">
          <div className="skin-panel-title">你今天怀疑的诱因</div>
          <div className="skin-trigger-grid">
            {TRIGGERS.map((trigger) => (
              <button
                key={trigger}
                className={`skin-trigger-chip ${record.triggers.includes(trigger) ? 'active' : ''}`}
                onClick={() => toggleTrigger(trigger)}
              >
                {trigger}
              </button>
            ))}
          </div>
        </div>

        <div className="skin-panel">
          <div className="skin-panel-title">你帮她拍的照片时间线</div>
          {photoTimeline.length === 0 ? (
            <div className="skin-empty-box">连续 3 到 4 次固定角度拍照后，对比会非常直观。</div>
          ) : (
            <div className="skin-timeline-grid">
              {photoTimeline.map((item) => (
                <div key={item.date} className="skin-timeline-card">
                  <img src={item.photos[0]} alt={`${item.date} 皮肤记录`} />
                  <div className="skin-timeline-meta">
                    <div>{dayjs(item.date).format('M月D日')}</div>
                    <span>严重度 {getSeverityScore(item)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="skin-panel">
          <div className="skin-panel-header">
            <div className="skin-panel-title">最近两次照片对比</div>
            <div className="skin-photo-hint">核心看有没有更红、更密、更明显</div>
          </div>
          {comparePhotos.length < 2 ? (
            <div className="skin-empty-box">至少要有两次带照片的记录，这里才会出现并排对比。</div>
          ) : (
            <div className="skin-compare-grid">
              {comparePhotos.map((item) => (
                <div key={item.date} className="skin-compare-card">
                  <img src={item.photos[0]} alt={`${item.date} 对比照片`} />
                  <div className="skin-compare-meta">
                    <strong>{dayjs(item.date).format('M月D日')}</strong>
                    <span>严重度 {getSeverityScore(item)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="skin-panel">
          <div className="skin-panel-header">
            <div className="skin-panel-title">照片对比</div>
            <button className="skin-upload-btn" onClick={() => fileInputRef.current?.click()}>
              <Camera size={16} />
              添加照片
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handlePhotoUpload}
            />
          </div>
          <div className="skin-photo-hint">尽量固定同一光线、同一距离、同一角度拍背部照片。</div>
          {record.photos.length > 0 ? (
            <div className="skin-photo-grid">
              {record.photos.map((photo, index) => (
                <div key={`${photo.slice(0, 24)}-${index}`} className="skin-photo-card">
                  <img src={photo} alt={`记录照片 ${index + 1}`} />
                </div>
              ))}
            </div>
          ) : (
            <div className="skin-empty-box">还没有照片，第一张最好作为治疗前基线。</div>
          )}
        </div>

        <div className="skin-panel">
          <div className="skin-panel-title">一句话补充</div>
          <textarea
            className="skin-note-input"
            placeholder="例如：今天运动后没及时洗澡，晚上更痒；或者换了新产品后更红。"
            value={record.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
          <button className="skin-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存你今天的观察'}
          </button>
        </div>

        <div className="skin-panel">
          <button className="skin-collapse-btn" onClick={() => setShowDetails((v) => !v)}>
            <span>详细记录</span>
            {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showDetails && (
            <div className="skin-details-wrap">
              <div className="skin-mini-section">
                <div className="skin-panel-header">
                  <div className="skin-panel-title">14 天执行与症状趋势</div>
                  <div className="skin-panel-badge">
                    <TrendingUp size={14} />
                    坚持天数 {adherenceDays}/14
                  </div>
                </div>
                <div className="skin-trend-chart">
                  {recentRecords.length === 0 ? (
                    <div className="skin-empty-box">先连续记录几天，这里会更容易看出护理是否真的有效。</div>
                  ) : (
                    recentRecords.map((item) => {
                      const severityHeight = Math.max(12, Math.min(100, getSeverityScore(item) * 3));
                      const routineHeight = Math.max(12, getRoutineScore(item));
                      return (
                        <div key={item.date} className="skin-trend-col">
                          <div className="skin-trend-bars">
                            <div className="skin-trend-bar severity" style={{ height: `${severityHeight}px` }} />
                            <div className="skin-trend-bar routine" style={{ height: `${routineHeight}px` }} />
                          </div>
                          <div className="skin-trend-date">{dayjs(item.date).format('M/D')}</div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="skin-trend-legend">
                  <span><i className="severity" /> 严重度</span>
                  <span><i className="routine" /> 护理执行</span>
                </div>
                <div className="skin-week-compare">{weekOverWeekSummary}</div>
              </div>

              <div className="skin-mini-section">
                <div className="skin-panel-title">你今天帮她观察到的症状</div>
                <div className="skin-level-grid">
                  {[
                    ['bumpLevel', '痘痘/疹子数量'],
                    ['itchLevel', '痒'],
                    ['painLevel', '疼痛'],
                    ['rednessLevel', '红'],
                  ].map(([key, label]) => (
                    <div key={key} className="skin-level-card">
                      <div className="skin-level-label">{label}</div>
                      <div className="skin-level-options">
                        {[0, 1, 2, 3, 4].map((level) => (
                          <button
                            key={level}
                            className={`skin-level-btn ${record[key as keyof SkinCareRecord] === level ? 'active' : ''}`}
                            onClick={() => updateField(key as keyof SkinCareRecord, level as never)}
                          >
                            {LEVEL_LABELS[level]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="skin-flag-row">
                  {[
                    ['pus', '有明显脓疱'],
                    ['spreading', '范围在扩散'],
                    ['rapidWorsening', '这两天突然加重'],
                    ['fever', '伴发热或全身不适'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      className={`skin-flag-chip ${record[key as keyof SkinCareRecord] ? 'active' : ''}`}
                      onClick={() => updateField(key as keyof SkinCareRecord, !record[key as keyof SkinCareRecord] as never)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="skin-mini-section">
                <div className="skin-panel-title">你今天怀疑的诱因</div>
                <div className="skin-trigger-grid">
                  {TRIGGERS.map((trigger) => (
                    <button
                      key={trigger}
                      className={`skin-trigger-chip ${record.triggers.includes(trigger) ? 'active' : ''}`}
                      onClick={() => toggleTrigger(trigger)}
                    >
                      {trigger}
                    </button>
                  ))}
                </div>
              </div>

              <div className="skin-mini-section">
                <div className="skin-panel-title">你今天帮她做到的护理动作</div>
                <div className="skin-routine-list">
                  {ROUTINE_ITEMS.map((item) => (
                    <button
                      key={item.key}
                      className={`skin-routine-item ${record.routine[item.key] ? 'done' : ''}`}
                      onClick={() => updateRoutine(item.key)}
                    >
                      <div>
                        <div className="skin-routine-label">{item.label}</div>
                        <div className="skin-routine-hint">{item.hint}</div>
                      </div>
                      <CheckCircle2 size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="skin-panel">
          <div className="skin-panel-header">
            <div className="skin-panel-title">带去看医生时你可以直接这样说</div>
            <button className="skin-upload-btn" onClick={handleCopySummary}>
              <Copy size={16} />
              复制近 7 天摘要
            </button>
          </div>
          <div className="skin-summary-list">
            {caregiverSummary.map((line, index) => (
              <div key={`${line}-${index}`} className="skin-summary-line">
                {line}
              </div>
            ))}
          </div>
          <pre className="skin-weekly-summary">{weeklySummary}</pre>
        </div>

        <div className="skin-advice-card">
          <div className="skin-advice-head">
            <CircleAlert size={18} />
            <span>你现在最适合怎么帮她</span>
          </div>
          <p>{doctorGuidance}</p>
        </div>

        <div className="skin-doctor-card">
          <div className="skin-doctor-title">
            <TriangleAlert size={18} />
            什么时候别再拖
          </div>
          <ul>
            <li>发热、明显疼痛、大片红肿、迅速扩散</li>
            <li>脓疱很多、反复发、抓破后越来越糟</li>
            <li>认真护理 2 到 4 周仍不见好转</li>
          </ul>
          <div className="skin-doctor-foot">
            <Clock3 size={16} />
            你带着这份记录和照片去看皮肤科，医生会更容易判断到底是痤疮、细菌性毛囊炎还是其他问题。
          </div>
        </div>

        <div className="skin-history">
          <div className="skin-panel-title">最近记录</div>
          {history.length === 0 ? (
            <div className="skin-empty-box">今天开始记录就很好，连续记录比一次判断更有价值。</div>
          ) : (
            history.slice(0, 6).map((item) => (
              <div key={item.date} className="skin-history-item">
                <div>
                  <div className="skin-history-date">{dayjs(item.date).format('M月D日')}</div>
                  <div className="skin-history-meta">
                    痘痘 {LEVEL_LABELS[item.bumpLevel]} · 痛 {LEVEL_LABELS[item.painLevel]} · 痒 {LEVEL_LABELS[item.itchLevel]}
                  </div>
                </div>
                <div className="skin-history-score">{getRoutineScore(item)}%</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
