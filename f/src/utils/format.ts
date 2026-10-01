export default function formatTime(timeStr: string) {
  const date = new Date(timeStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 过滤金额输入：只允许数字和一个小数点，最多 2 位小数，去除前导零，保证 > 0
export const formatAmountInput = (value: string): string => {
  if (!value) return '';
  // 只保留数字和小数点
  let cleaned = value.replace(/[^\d.]/g, '');
  // 只保留第一个小数点
  const firstDotIndex = cleaned.indexOf('.');
  if (firstDotIndex !== -1) {
    cleaned =
      cleaned.slice(0, firstDotIndex + 1) + cleaned.slice(firstDotIndex + 1).replace(/\./g, '');
  }
  // 去除前导零（但保留 0.xx 形式，以及输入过程中的单个 0）
  if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '') || '0';
  }
  // 最多 2 位小数
  if (firstDotIndex !== -1) {
    const parts = cleaned.split('.');
    if (parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
  }
  return cleaned;
};

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
};
