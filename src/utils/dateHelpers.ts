import dayjs from 'dayjs';
import { Lunar, Solar } from 'lunar-javascript';
import type { MemorialEvent } from '../types';

export interface EventCountdown {
  event: MemorialEvent;
  daysRemaining: number;
  nextDate: dayjs.Dayjs;
  yearsSince: number;
  isToday: boolean;
  lunarLabel?: string;
}

function lunarToSolar(lunarYear: number, lunarMonth: number, lunarDay: number): dayjs.Dayjs {
  try {
    const lunar = Lunar.fromYmd(lunarYear, lunarMonth, lunarDay);
    const solar = lunar.getSolar();
    return dayjs(`${solar.getYear()}-${solar.getMonth()}-${solar.getDay()}`);
  } catch {
    return dayjs();
  }
}

export function getNextOccurrence(event: MemorialEvent): dayjs.Dayjs {
  const today = dayjs().startOf('day');
  const original = dayjs(event.date);

  if (!event.repeatYearly) {
    return original;
  }

  if (event.calendarMode === 'lunar' && event.lunarMonth && event.lunarDay) {
    let next = lunarToSolar(today.year(), event.lunarMonth, event.lunarDay);
    if (next.isBefore(today)) {
      next = lunarToSolar(today.year() + 1, event.lunarMonth, event.lunarDay);
    }
    return next;
  }

  let next = original.year(today.year());
  if (next.isBefore(today)) {
    next = next.add(1, 'year');
  }
  return next;
}

export function calculateCountdown(event: MemorialEvent): EventCountdown {
  const today = dayjs().startOf('day');
  const original = dayjs(event.date);
  const nextDate = getNextOccurrence(event);
  const daysRemaining = nextDate.diff(today, 'day');

  let yearsSince: number;
  if (event.calendarMode === 'lunar' && event.lunarMonth && event.lunarDay) {
    const origSolar = Solar.fromYmd(original.year(), original.month() + 1, original.date());
    const origLunarYear = origSolar.getLunar().getYear();
    const nextSolar = Solar.fromYmd(nextDate.year(), nextDate.month() + 1, nextDate.date());
    const nextLunarYear = nextSolar.getLunar().getYear();
    yearsSince = nextLunarYear - origLunarYear;
  } else {
    yearsSince = nextDate.year() - original.year();
  }

  const lunarLabel = event.calendarMode === 'lunar' && event.lunarMonth && event.lunarDay
    ? getLunarDateStr(event.lunarMonth, event.lunarDay)
    : undefined;

  return {
    event,
    daysRemaining,
    nextDate,
    yearsSince,
    isToday: daysRemaining === 0,
    lunarLabel,
  };
}

export function sortByCountdown(events: MemorialEvent[]): EventCountdown[] {
  return events
    .map(calculateCountdown)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function formatCountdown(days: number): string {
  if (days === 0) return '就是今天!';
  if (days < 0) return `已过 ${Math.abs(days)} 天`;
  if (days === 1) return '明天';
  if (days === 2) return '后天';
  if (days <= 30) return `还有 ${days} 天`;
  const months = Math.floor(days / 30);
  const remainDays = days % 30;
  if (remainDays === 0) return `还有 ${months} 个月`;
  return `还有 ${months} 个月 ${remainDays} 天`;
}

export function getEventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    birthday: '生日',
    anniversary: '纪念日',
    memorial: '忌日',
    custom: '自定义',
  };
  return map[type] || type;
}

export function getEventTypeIcon(type: string): string {
  const map: Record<string, string> = {
    birthday: '🎂',
    anniversary: '💕',
    memorial: '🕯️',
    custom: '⭐',
  };
  return map[type] || '📅';
}

export function getYearLabel(event: MemorialEvent, yearsSince: number): string {
  if (yearsSince <= 0) return '';
  if (event.type === 'birthday') return `第 ${yearsSince} 岁`;
  if (event.type === 'anniversary') return `第 ${yearsSince} 周年`;
  if (event.type === 'memorial') return `第 ${yearsSince} 年`;
  return `第 ${yearsSince} 年`;
}

const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

export function getLunarDateStr(month: number, day: number): string {
  const m = LUNAR_MONTHS[month - 1] || month;
  const d = LUNAR_DAYS[day - 1] || day;
  return `农历${m}月${d}`;
}

export function solarToLunarInfo(year: number, month: number, day: number) {
  try {
    const solar = Solar.fromYmd(year, month, day);
    const lunar = solar.getLunar();
    return {
      year: lunar.getYear(),
      month: lunar.getMonth(),
      day: lunar.getDay(),
      str: getLunarDateStr(lunar.getMonth(), lunar.getDay()),
    };
  } catch {
    return null;
  }
}

export function lunarToSolarDate(lunarYear: number, lunarMonth: number, lunarDay: number) {
  try {
    const lunar = Lunar.fromYmd(lunarYear, lunarMonth, lunarDay);
    const solar = lunar.getSolar();
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
    };
  } catch {
    return null;
  }
}

export function getLunarMonthDays(lunarYear: number, lunarMonth: number): number {
  try {
    const lunar = Lunar.fromYmd(lunarYear, lunarMonth, 1);
    const month = lunar.getMonth();
    let days = 29;
    for (let d = 30; d >= 29; d--) {
      try {
        const test = Lunar.fromYmd(lunarYear, month, d);
        if (test.getDay() === d) { days = d; break; }
      } catch { /* month doesn't have this day */ }
    }
    return days;
  } catch {
    return 30;
  }
}
