// INTERMEDIATE CODE GENERATION MODULE
class TACGenerator {
  constructor(ast) {
    this.ast = ast;
    this.code = [];
    this.tmpCount = 0;
    this.labelCount = 0;
  }

  newTmp() { return `t${++this.tmpCount}`; }
  newLabel() { return `L${++this.labelCount}`; }
  emit(line) { this.code.push(line); }

  generate() {
    if (!this.ast) return [];
    for (const s of this.ast.body) this.genStatement(s);
    return this.code;
  }

  genStatement(node) {
    if (!node) return;
    if (node.type === 'FunctionDef') {
      this.emit(`; --- function ${node.name}(${node.params.join(', ')}) ---`);
      this.emit(`func_begin ${node.name}`);
      for (const p of node.params) this.emit(`param ${p}`);
      if (node.body && node.body.body) for (const s of node.body.body) this.genStatement(s);
      this.emit(`func_end ${node.name}`);
      this.emit('');
    } else if (node.type === 'Declaration') {
      if (node.init) {
        const tmp = this.genExpr(node.init);
        this.emit(`${node.name} = ${tmp}`);
      } else {
        this.emit(`${node.name} = 0`);
      }
    } else if (node.type === 'Assignment') {
      const tmp = this.genExpr(node.value);
      this.emit(`${node.name} = ${tmp}`);
    } else if (node.type === 'Return') {
      const tmp = this.genExpr(node.value);
      this.emit(`return ${tmp}`);
    } else if (node.type === 'IfNode') {
      const cond = this.genExpr(node.condition);
      const elseLabel = this.newLabel();
      const endLabel = this.newLabel();
      this.emit(`if_false ${cond} goto ${elseLabel}`);
      for (const s of node.body) this.genStatement(s);
      if (node.elseBody) {
        this.emit(`goto ${endLabel}`);
        this.emit(`${elseLabel}:`);
        for (const s of node.elseBody) this.genStatement(s);
        this.emit(`${endLabel}:`);
      } else {
        this.emit(`${elseLabel}:`);
      }
    } else if (node.type === 'WhileNode') {
      const startLabel = this.newLabel();
      const endLabel = this.newLabel();
      this.emit(`${startLabel}:`);
      const cond = this.genExpr(node.condition);
      this.emit(`if_false ${cond} goto ${endLabel}`);
      for (const s of node.body) this.genStatement(s);
      this.emit(`goto ${startLabel}`);
      this.emit(`${endLabel}:`);
    } else if (node.type === 'ExprStmt') {
      this.genExpr(node.expr);
    }
  }

  genExpr(node) {
    if (!node) return '?';
    if (node.type === 'Number' || node.type === 'Float') return String(node.value);
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'BinOp') {
      const l = this.genExpr(node.left);
      const r = this.genExpr(node.right);
      const tmp = this.newTmp();
      this.emit(`${tmp} = ${l} ${node.op} ${r}`);
      return tmp;
    }
    if (node.type === 'FuncCall') {
      for (const a of node.args) {
        const at = this.genExpr(a);
        this.emit(`push_arg ${at}`);
      }
      const tmp = this.newTmp();
      this.emit(`${tmp} = call ${node.name}, ${node.args.length}`);
      return tmp;
    }
    return '?';
  }
}

// ============================================================
// TAC RENDERER (HTML output)
// ============================================================
function renderTAC(lines) {
  let html = '';
  lines.forEach((line, i) => {
    if (line.trim() === '') { html += `<div style="height:6px"></div>`; return; }

    let formatted = escHtml(line);

    if (line.trim().startsWith(';')) {
      html += `<div class="tac-line"><span class="tac-num">${i+1}</span><span class="tac-comment">${formatted}</span></div>`;
      return;
    }

    if (line.trim().endsWith(':')) {
      html += `<div class="tac-line"><span class="tac-num">${i+1}</span><span style="color:var(--green);font-weight:600">${formatted}</span></div>`;
      return;
    }

    formatted = formatted.replace(/\b(func_begin|func_end|param|return|push_arg|call|if_false|goto)\b/g,
      m => `<span class="tac-kw">${m}</span>`);
    formatted = formatted.replace(/\bt\d+\b/g, m => `<span class="tac-tmp">${m}</span>`);

    html += `<div class="tac-line"><span class="tac-num">${i+1}</span><span class="tac-code">${formatted}</span></div>`;
  });
  return html;
}
