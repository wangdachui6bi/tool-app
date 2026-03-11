import { useNavigate } from 'react-router-dom';
import {
  CalendarHeart, CheckSquare, CalendarClock, ListTodo, Dices,
  Droplets, Scale, Calculator,
  Timer, QrCode,
  Receipt, RulerIcon,
} from 'lucide-react';
import './Toolbox.css';

interface ToolItem {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  path: string;
}

interface ToolCategory {
  title: string;
  tools: ToolItem[];
}

const CATEGORIES: ToolCategory[] = [
  {
    title: '日常生活',
    tools: [
      { id: 'anniversary', name: '纪念日提醒', desc: '生日、纪念日倒计时', icon: CalendarHeart, color: '#6366F1', path: '/anniversary' },
      { id: 'habit', name: '习惯打卡', desc: '每日习惯追踪', icon: CheckSquare, color: '#10B981', path: '/tool/habit' },
      { id: 'countdown', name: '倒数日', desc: '重要日子倒计时', icon: CalendarClock, color: '#F59E0B', path: '/tool/countdown' },
      { id: 'todo', name: '待办清单', desc: '任务管理', icon: ListTodo, color: '#8B5CF6', path: '/tool/todo' },
      { id: 'random', name: '随机决策', desc: '选择困难症救星', icon: Dices, color: '#A855F7', path: '/tool/random' },
    ],
  },
  {
    title: '健康管理',
    tools: [
      { id: 'water', name: '喝水记录', desc: '每日饮水追踪', icon: Droplets, color: '#3B82F6', path: '/tool/water' },
      { id: 'weight', name: '体重记录', desc: '体重趋势追踪', icon: Scale, color: '#EC4899', path: '/tool/weight' },
      { id: 'bmi', name: 'BMI计算', desc: '身体质量指数', icon: Calculator, color: '#14B8A6', path: '/tool/bmi' },
    ],
  },
  {
    title: '效率工具',
    tools: [
      { id: 'pomodoro', name: '番茄钟', desc: '专注工作计时', icon: Timer, color: '#EF4444', path: '/tool/pomodoro' },
      { id: 'qrcode', name: '二维码', desc: '生成二维码', icon: QrCode, color: '#1E293B', path: '/tool/qrcode' },
    ],
  },
  {
    title: '计算工具',
    tools: [
      { id: 'tax', name: '个税计算', desc: '个人所得税速算', icon: Receipt, color: '#F97316', path: '/tool/tax' },
      { id: 'ruler', name: '尺子', desc: '屏幕测量工具', icon: RulerIcon, color: '#64748B', path: '/tool/ruler' },
    ],
  },
];

export default function Toolbox() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="page-content">
        <div className="toolbox-header">
          <h1 className="toolbox-title">工具箱</h1>
          <p className="toolbox-subtitle">{CATEGORIES.reduce((s, c) => s + c.tools.length, 0)} 个工具</p>
        </div>

        {CATEGORIES.map(cat => (
          <div key={cat.title} className="toolbox-section fade-in">
            <div className="toolbox-section-title">{cat.title}</div>
            <div className="toolbox-grid">
              {cat.tools.map(tool => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.id}
                    className="toolbox-card"
                    onClick={() => navigate(tool.path)}
                  >
                    <div className="toolbox-card-icon" style={{ background: `${tool.color}12`, color: tool.color }}>
                      <Icon size={24} />
                    </div>
                    <div className="toolbox-card-info">
                      <div className="toolbox-card-name">{tool.name}</div>
                      <div className="toolbox-card-desc">{tool.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
