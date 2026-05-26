// SYNTAX ANALYSIS MODULE

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.errors = [];
  }

  peek(offset=0) { return this.tokens[Math.min(this.pos+offset, this.tokens.length-1)]; }
  advance() { const t = this.peek(); if (t.type !== 'EOF') this.pos++; return t; }

  expect(type, value=null) {
    const t = this.peek();
    if (t.type !== type || (value && t.value !== value)) {
      this.errors.push({ msg: `Expected ${value||type} but got '${t.value}'`, line: t.line });
      return null;
    }
    return this.advance();
  }

  match(type, value=null) {
    const t = this.peek();
    if (t.type === type && (!value || t.value === value)) { this.advance(); return true; }
    return false;
  }

  parseProgram() {
    const stmts = [];
    while (this.peek().type !== 'EOF') {
      const s = this.parseStatement();
      if (s) stmts.push(s);
    }
    return { type: 'Program', body: stmts };
  }

  parseStatement() {
    const t = this.peek();
    if (t.type === 'KEYWORD') {
      if (t.value === 'kaam') return this.parseFunctionDef();
      if (t.value === 'maan_lo') return this.parseDeclaration();
      if (t.value === 'wapas') return this.parseReturn();
      if (t.value === 'agar') return this.parseIf();
      if (t.value === 'jab_tak') return this.parseWhile();
      if (t.value === 'khatam') { this.advance(); return null; }
      if (t.value === 'toh' || t.value === 'warna' || t.value === 'karo' || t.value === 'shuru') {
        this.advance(); return null;
      }
    }
    if (t.type === 'IDENTIFIER') {
      const next = this.peek(1);
      if (next.type === 'OPERATOR' && next.value === '=') return this.parseAssignment();
      if (next.type === 'DELIMITER' && next.value === '(') {
        const expr = this.parseExpr();
        this.match('DELIMITER', ';');
        return { type: 'ExprStmt', expr };
      }
    }
    if (t.type !== 'EOF') { this.advance(); }
    return null;
  }

  parseFunctionDef() {
    this.advance(); // kaam
    const name = this.expect('IDENTIFIER');
    this.expect('DELIMITER', '(');
    const params = [];
    while (this.peek().type !== 'DELIMITER' || this.peek().value !== ')') {
      if (this.peek().type === 'EOF') break;
      if (this.peek().type === 'IDENTIFIER') params.push(this.advance().value);
      else if (this.peek().value === ',') this.advance();
      else break;
    }
    this.expect('DELIMITER', ')');
    this.expect('KEYWORD', 'shuru');
    const body = this.parseBlock();
    return { type: 'FunctionDef', name: name ? name.value : '?', params, body };
  }

  parseBlock() {
    const stmts = [];
    while (true) {
      const t = this.peek();
      if (t.type === 'EOF' || (t.type === 'KEYWORD' && t.value === 'khatam')) {
        this.match('KEYWORD', 'khatam'); break;
      }
      const s = this.parseStatement();
      if (s) stmts.push(s);
    }
    return { type: 'Block', body: stmts };
  }

  parseDeclaration() {
    this.advance(); // maan_lo
    const name = this.expect('IDENTIFIER');
    let init = null;
    if (this.match('OPERATOR', '=')) init = this.parseExpr();
    this.match('DELIMITER', ';');
    return { type: 'Declaration', name: name ? name.value : '?', init };
  }

  parseReturn() {
    this.advance(); // wapas
    const val = this.parseExpr();
    this.match('DELIMITER', ';');
    return { type: 'Return', value: val };
  }

  parseIf() {
    this.advance(); // agar
    const cond = this.parseBinopExpr();
    this.match('KEYWORD', 'toh');
    const body = [];
    while (true) {
      const t = this.peek();
      if (t.type === 'EOF') break;
      if (t.type === 'KEYWORD' && (t.value === 'warna' || t.value === 'khatam')) break;
      const s = this.parseStatement();
      if (s) body.push(s);
    }
    let elseBody = null;
    if (this.peek().type === 'KEYWORD' && this.peek().value === 'warna') {
      this.advance();
      elseBody = [];
      while (true) {
        const t = this.peek();
        if (t.type === 'EOF' || (t.type === 'KEYWORD' && t.value === 'khatam')) {
          this.match('KEYWORD','khatam'); break;
        }
        const s = this.parseStatement();
        if (s) elseBody.push(s);
      }
    } else { this.match('KEYWORD','khatam'); }
    return { type: 'IfNode', condition: cond, body, elseBody };
  }

  parseWhile() {
    this.advance(); // jab_tak
    const cond = this.parseBinopExpr();
    this.match('KEYWORD', 'karo');
    const body = [];
    while (true) {
      const t = this.peek();
      if (t.type === 'EOF' || (t.type === 'KEYWORD' && t.value === 'khatam')) {
        this.match('KEYWORD','khatam'); break;
      }
      const s = this.parseStatement();
      if (s) body.push(s);
    }
    return { type: 'WhileNode', condition: cond, body };
  }

  parseAssignment() {
    const name = this.advance().value;
    this.advance(); // =
    const val = this.parseExpr();
    this.match('DELIMITER', ';');
    return { type: 'Assignment', name, value: val };
  }

  parseExpr() { return this.parseBinopExpr(); }

  parseBinopExpr() {
    let left = this.parsePrimary();
    while (this.peek().type === 'OPERATOR' && ['+','-','*','/','<','>','==','!=','<=','>='].includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parsePrimary();
      left = { type: 'BinOp', op, left, right };
    }
    return left;
  }

  parsePrimary() {
    const t = this.peek();
    if (t.type === 'NUMBER') { this.advance(); return { type: 'Number', value: parseFloat(t.value) }; }
    if (t.type === 'FLOAT') { this.advance(); return { type: 'Float', value: parseFloat(t.value) }; }
    if (t.type === 'IDENTIFIER') {
      const next = this.peek(1);
      if (next.type === 'DELIMITER' && next.value === '(') {
        this.advance(); // name
        this.advance(); // (
        const args = [];
        while (this.peek().value !== ')' && this.peek().type !== 'EOF') {
          args.push(this.parseExpr());
          this.match('DELIMITER', ',');
        }
        this.match('DELIMITER', ')');
        return { type: 'FuncCall', name: t.value, args };
      }
      this.advance();
      return { type: 'Identifier', name: t.value };
    }
    if (t.type === 'DELIMITER' && t.value === '(') {
      this.advance();
      const e = this.parseExpr();
      this.match('DELIMITER', ')');
      return e;
    }
    if (t.type !== 'EOF') this.advance();
    return { type: 'Unknown', value: t.value };
  }
}

// ============================================================
// AST PRINTER (Text)
// ============================================================
function printAST(node, indent=0) {
  if (!node) return '';
  const pad = '  '.repeat(indent);
  let out = '';

  const color = (cls, text) => `<span class="${cls}">${text}</span>`;

  if (node.type === 'Program') {
    out += `${pad}${color('ast-node','Program')}\n`;
    for (const s of node.body) if(s) out += printAST(s, indent+1);
  } else if (node.type === 'FunctionDef') {
    out += `${pad}${color('ast-kw','FunctionDef')} ${color('ast-val', node.name)}`;
    if (node.params.length) out += ` ${color('ast-attr','params:')}${color('ast-val',node.params.join(','))}`;
    out += '\n';
    out += printAST(node.body, indent+1);
  } else if (node.type === 'Block') {
    out += `${pad}${color('ast-node','Block')}\n`;
    for (const s of node.body) if(s) out += printAST(s, indent+1);
  } else if (node.type === 'Declaration') {
    out += `${pad}${color('ast-kw','Declaration')} ${color('ast-val',node.name)}\n`;
    if (node.init) out += printAST(node.init, indent+1);
  } else if (node.type === 'Assignment') {
    out += `${pad}${color('ast-kw','Assignment')} ${color('ast-val',node.name)}\n`;
    out += printAST(node.value, indent+1);
  } else if (node.type === 'Return') {
    out += `${pad}${color('ast-kw','Return')}\n`;
    out += printAST(node.value, indent+1);
  } else if (node.type === 'BinOp') {
    out += `${pad}${color('ast-node','BinOp')} ${color('ast-attr','op:')}${color('ast-val',node.op)}\n`;
    out += printAST(node.left, indent+1);
    out += printAST(node.right, indent+1);
  } else if (node.type === 'IfNode') {
    out += `${pad}${color('ast-kw','IfNode')}\n`;
    out += `${'  '.repeat(indent+1)}${color('ast-attr','cond:')}\n` + printAST(node.condition, indent+2);
    out += `${'  '.repeat(indent+1)}${color('ast-attr','then:')}\n`;
    for (const s of node.body) if(s) out += printAST(s, indent+2);
    if (node.elseBody) {
      out += `${'  '.repeat(indent+1)}${color('ast-attr','else:')}\n`;
      for (const s of node.elseBody) if(s) out += printAST(s, indent+2);
    }
  } else if (node.type === 'WhileNode') {
    out += `${pad}${color('ast-kw','WhileNode')}\n`;
    out += `${'  '.repeat(indent+1)}${color('ast-attr','cond:')}\n` + printAST(node.condition, indent+2);
    out += `${'  '.repeat(indent+1)}${color('ast-attr','body:')}\n`;
    for (const s of node.body) if(s) out += printAST(s, indent+2);
  } else if (node.type === 'FuncCall') {
    out += `${pad}${color('ast-node','FuncCall')} ${color('ast-val',node.name)}\n`;
    for (const a of node.args) out += printAST(a, indent+1);
  } else if (node.type === 'Identifier') {
    out += `${pad}${color('ast-attr','Identifier:')} ${color('ast-val',node.name)}\n`;
  } else if (node.type === 'Number' || node.type === 'Float') {
    out += `${pad}${color('ast-attr',node.type+':')} ${color('ast-val',node.value)}\n`;
  } else if (node.type === 'ExprStmt') {
    out += `${pad}${color('ast-node','ExprStmt')}\n`;
    out += printAST(node.expr, indent+1);
  } else {
    out += `${pad}${color('ast-attr',node.type||'?')} ${color('ast-val',node.value||'')}\n`;
  }
  return out;
}

// ============================================================
// AST GRAPH (SVG)
// ============================================================
function buildASTGraph(ast) {
  const nodes = [];
  const edges = [];
  let idCounter = 0;

  function visit(node, parentId=null) {
    if (!node) return;
    const id = idCounter++;
    let label = node.type || '?';
    let sub = '';
    if (node.type === 'FunctionDef') sub = node.name;
    if (node.type === 'Declaration' || node.type === 'Assignment') sub = node.name;
    if (node.type === 'Identifier') sub = node.name;
    if (node.type === 'Number' || node.type === 'Float') sub = String(node.value);
    if (node.type === 'BinOp') sub = node.op;
    if (node.type === 'FuncCall') sub = node.name;

    nodes.push({ id, label, sub });
    if (parentId !== null) edges.push({ from: parentId, to: id });

    const children = [];
    if (node.body && Array.isArray(node.body)) children.push(...node.body.filter(Boolean));
    if (node.body && node.body.body) children.push(...node.body.body.filter(Boolean));
    if (node.init) children.push(node.init);
    if (node.value) children.push(node.value);
    if (node.left) children.push(node.left);
    if (node.right) children.push(node.right);
    if (node.condition) children.push(node.condition);
    if (Array.isArray(node.args)) children.push(...node.args.filter(Boolean));
    if (Array.isArray(node.elseBody)) children.push(...node.elseBody.filter(Boolean));
    if (node.expr) children.push(node.expr);

    for (const c of children) visit(c, id);
  }

  visit(ast);

  const NODE_W = 100, NODE_H = 38, H_GAP = 20, V_GAP = 60;

  const childMap = {};
  for (const e of edges) {
    if (!childMap[e.from]) childMap[e.from] = [];
    childMap[e.from].push(e.to);
  }

  const depths = {};
  function assignDepth(id, d) {
    if (depths[id] !== undefined && depths[id] <= d) return;
    depths[id] = d;
    if (childMap[id]) for (const c of childMap[id]) assignDepth(c, d+1);
  }
  if (nodes.length > 0) assignDepth(0, 0);

  const byDepth = {};
  for (const n of nodes) {
    const d = depths[n.id] || 0;
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(n.id);
  }

  const positions = {};
  const maxDepth = Math.max(...Object.keys(byDepth).map(Number));

  for (let d = 0; d <= maxDepth; d++) {
    const row = byDepth[d] || [];
    const totalW = row.length * (NODE_W + H_GAP) - H_GAP;
    let startX = Math.max(20, 400 - totalW/2);
    for (const id of row) {
      positions[id] = { x: startX, y: 30 + d * (NODE_H + V_GAP) };
      startX += NODE_W + H_GAP;
    }
  }

  const totalH = (maxDepth + 1) * (NODE_H + V_GAP) + 60;
  const maxX = Math.max(...nodes.map(n => (positions[n.id]?.x || 0) + NODE_W)) + 20;
  const svgW = Math.max(700, maxX);

  const colorMap = {
    'Program': '#1a2040', 'FunctionDef': '#2a1a40', 'Block': '#1a2830',
    'Declaration': '#1a2840', 'Assignment': '#1a2840', 'BinOp': '#2a2010',
    'IfNode': '#2a1a20', 'WhileNode': '#1a2020', 'FuncCall': '#202040',
    'Return': '#2a1a10', 'Identifier': '#1a2010', 'Number': '#1a1a30', 'Float': '#1a1a30',
  };
  const strokeMap = {
    'Program': '#4f9cf9', 'FunctionDef': '#a78bfa', 'Block': '#2dd4bf',
    'Declaration': '#4f9cf9', 'Assignment': '#4f9cf9', 'BinOp': '#f5a623',
    'IfNode': '#f55353', 'WhileNode': '#4caf7d', 'FuncCall': '#a78bfa',
    'Return': '#f5a623', 'Identifier': '#4caf7d', 'Number': '#2dd4bf', 'Float': '#2dd4bf',
  };

  let svg = `<svg viewBox="0 0 ${svgW} ${totalH}" xmlns="http://www.w3.org/2000/svg" style="min-width:${svgW}px;font-family:'JetBrains Mono',monospace">`;
  svg += `<rect width="${svgW}" height="${totalH}" fill="#0d0f14"/>`;

  for (const e of edges) {
    const from = positions[e.from];
    const to = positions[e.to];
    if (!from || !to) continue;
    const x1 = from.x + NODE_W/2, y1 = from.y + NODE_H;
    const x2 = to.x + NODE_W/2, y2 = to.y;
    const cy = (y1 + y2) / 2;
    svg += `<path d="M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}" stroke="#2a3048" stroke-width="1.5" fill="none"/>`;
  }

  for (const n of nodes) {
    const pos = positions[n.id];
    if (!pos) continue;
    const bg = colorMap[n.label] || '#1a1e2a';
    const stroke = strokeMap[n.label] || '#3a4060';
    svg += `<rect x="${pos.x}" y="${pos.y}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="${bg}" stroke="${stroke}" stroke-width="1"/>`;
    svg += `<text x="${pos.x+NODE_W/2}" y="${pos.y+14}" text-anchor="middle" fill="${stroke}" font-size="9" font-weight="600">${n.label}</text>`;
    if (n.sub) svg += `<text x="${pos.x+NODE_W/2}" y="${pos.y+26}" text-anchor="middle" fill="#9aa0ba" font-size="9">${n.sub.length > 12 ? n.sub.slice(0,11)+'…' : n.sub}</text>`;
  }

  svg += '</svg>';
  return svg;
}