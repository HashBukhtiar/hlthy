export function displayShortenedString(username: string, maxLength: number): string {
    if (username.length > maxLength) {
        return username.substring(0, maxLength) + '...';
    }
    return username;
}

export function formatAIResponse(text: string): string {
    let formattedText = text.trim();
  
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  
    const lines = formattedText.split('\n');
    const formattedLines = lines.map((line) => {
      if (/^\*\s/.test(line)) {
        return `<li>${line.replace(/^\*\s/, '')}</li>`;
      }
      return line;
    });
  
    let result = '';
    let inList = false;
    formattedLines.forEach((line) => {
      if (line.startsWith('<li>')) {
        if (!inList) {
          result += '<ul>';
          inList = true;
        }
        result += line;
      } else {
        if (inList) {
          result += '</ul>';
          inList = false;
        }
        result += line;
      }
      result += '\n';
    });
    if (inList) {
      result += '</ul>';
    }
  
    return result;
}

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