export const formatCount = (num: number): string => {
  if (num < 0) return '0';
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    const thousands = num / 1000;
    return (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
  } else {
    const millions = num / 1000000;
    return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
  }
};