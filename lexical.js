// LEXICAL ANALYSIS MODULE

const KEYWORDS = new Set([
  'maan_lo','kaam','shuru','khatam','wapas',
  'agar','toh','warna','jab_tak','karo'
]);

const TOKEN_PATTERNS = [
  { type: 'COMMENT',    re: /^\/\/[^\n]*/ },
  { type: 'FLOAT',      re: /^\d+\.\d+/ },
  { type: 'NUMBER',     re: /^\d+/ },
  { type: 'IDENTIFIER', re: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
  { type: 'OPERATOR',   re: /^(==|!=|<=|>=|[+\-*\/=<>])/ },
  { type: 'DELIMITER',  re: /^[;,(){}]/ },
  { type: 'WHITESPACE', re: /^[ \t\r]+/ },
  { type: 'NEWLINE',    re: /^\n/ },
];

class Lexer {
  constructor(src) {
    this.src = src;
    this.pos = 0;
    this.line = 1;
    this.tokens = [];
    this.errors = [];
  }

  tokenize() {
    while (this.pos < this.src.length) {
      let matched = false;
      const remaining = this.src.slice(this.pos);
      for (const { type, re } of TOKEN_PATTERNS) {
        const m = remaining.match(re);
        if (m) {
          const val = m[0];
          if (type === 'NEWLINE') { this.line++; }
          else if (type !== 'WHITESPACE' && type !== 'COMMENT') {
            let actualType = type;
            if (type === 'IDENTIFIER' && KEYWORDS.has(val)) actualType = 'KEYWORD';
            this.tokens.push({ type: actualType, value: val, line: this.line });
          }
          this.pos += val.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        this.errors.push({ msg: `Invalid character '${this.src[this.pos]}'`, line: this.line });
        this.pos++;
      }
    }
    this.tokens.push({ type: 'EOF', value: 'EOF', line: this.line });
    return this.tokens;
  }
}