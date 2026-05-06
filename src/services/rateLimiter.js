// Simple rate limiter for LINE Bot
const userLastMessage = new Map();
const RATE_LIMIT_MS = 1000; // 1 second between messages per user

function isRateLimited(userId) {
    const now = Date.now();
    const lastMessage = userLastMessage.get(userId);
    
    if (lastMessage && (now - lastMessage) < RATE_LIMIT_MS) {
        return true;
    }
    
    userLastMessage.set(userId, now);
    return false;
}

function getRemainingTime(userId) {
    const now = Date.now();
    const lastMessage = userLastMessage.get(userId);
    
    if (lastMessage) {
        const remaining = RATE_LIMIT_MS - (now - lastMessage);
        return Math.max(0, remaining);
    }
    
    return 0;
}

module.exports = {
    isRateLimited,
    getRemainingTime
};
