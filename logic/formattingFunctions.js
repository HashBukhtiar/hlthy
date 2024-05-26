export function displayShortenedString(username, maxLength) {
    if (username.length > maxLength) {
        return username.substring(0, maxLength) + '...';
    }
    return username;
}