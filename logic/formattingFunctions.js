export function displayShortenedString(username, maxLength) {
    if (username.length > maxLength) {
        return username.substring(0, maxLength) + '...';
    }
    return username;
}

export function formatAIResponse(text) {
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