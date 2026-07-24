// ============================================
// 💰 FINANCE UTILITY FUNCTIONS
// ============================================

// --- PARSE FORMULA ---

function parseAmountFormula(val) {
    if(typeof val === 'string' && val.trim().startsWith('=')) {
        try {
            const expr = val.trim().substring(1);
            // Safe math parser — only allows +, -, *, /, parentheses, numbers, and decimals
            const sanitized = expr.replace(/[^0-9+\-*/().,\s]/g, '').replace(',', '.');
            const result = safeEval(sanitized);
            if(typeof result === 'number' && isFinite(result) && result > 0) {
                return Math.round(result * 100) / 100;
            }
        } catch(e) {}
    }
    return parseFloat(val);
}

function safeEval(expr) {
    // Simple recursive descent parser for basic arithmetic
    const tokens = expr.match(/(\d+\.?\d*|[+\-*/().])/g) || [];
    let pos = 0;
    
    function peek() { return tokens[pos] || ''; }
    function consume() { return tokens[pos++]; }
    
    function parseAddSub() {
        let left = parseMulDiv();
        while (peek() === '+' || peek() === '-') {
            const op = consume();
            const right = parseMulDiv();
            if (op === '+') left += right;
            else left -= right;
        }
        return left;
    }
    
    function parseMulDiv() {
        let left = parsePrimary();
        while (peek() === '*' || peek() === '/') {
            const op = consume();
            const right = parsePrimary();
            if (op === '*') left *= right;
            else if (right === 0) throw new Error('Division by zero');
            else left /= right;
        }
        return left;
    }
    
    function parsePrimary() {
        if (peek() === '(') {
            consume(); // '('
            const val = parseAddSub();
            if (peek() === ')') consume(); // ')'
            return val;
        }
        if (peek() === '-') {
            consume();
            return -parsePrimary();
        }
        const num = parseFloat(consume());
        if (isNaN(num)) throw new Error('Invalid number');
        return num;
    }
    
    return parseAddSub();
}

// --- DATE FORMAT HELPER ---

function formatFinanceDate(dateStr) {
    if(!dateStr) return '';
    if(/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('-');
    if(parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
}