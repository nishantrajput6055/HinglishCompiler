
class SemanticAnalyzer {
  constructor(ast) {
    this.ast = ast;
    this.globalScope = {};
    this.functions = {};
    this.errors = [];
    this.symbolTable = [];
  }

  analyze() {
    if (!this.ast) return;
    this.visitProgram(this.ast);
  }

  visitProgram(node) {
    for (const s of node.body) {
      if (s && s.type === 'FunctionDef') this.visitFunctionDef(s, true);
    }
    for (const s of node.body) {
      if (s && s.type !== 'FunctionDef') this.visitStatement(s, this.globalScope, 'global');
    }
  }

  visitFunctionDef(node, register=false) {
    if (register) {
      if (this.functions[node.name]) {
        this.errors.push(`Function '${node.name}' already defined`);
      }
      this.functions[node.name] = { params: node.params };
      this.symbolTable.push({ name: node.name, type: 'function', scope: 'global', params: node.params.join(', ') });
    }
    const localScope = { ...this.globalScope };
    for (const p of node.params) {
      localScope[p] = { type: 'param', varType: 'auto' };
      this.symbolTable.push({ name: p, type: 'param', scope: node.name, varType: 'auto' });
    }
    this.visitBlock(node.body, localScope, node.name);
  }

  visitBlock(block, scope, scopeName) {
    if (!block || !block.body) return;
    for (const s of block.body) this.visitStatement(s, scope, scopeName);
  }

  visitStatement(node, scope, scopeName) {
    if (!node) return;
    if (node.type === 'Declaration') {
      if (scope[node.name]) {
        this.errors.push(`Variable '${node.name}' already declared in scope '${scopeName}'`);
      }
      let varType = 'auto';
      if (node.init) {
        varType = this.inferType(node.init, scope);
        this.checkExpr(node.init, scope, scopeName);
      }
      scope[node.name] = { type: 'var', varType };
      this.symbolTable.push({ name: node.name, type: 'var', scope: scopeName, varType });
    } else if (node.type === 'Assignment') {
      if (!scope[node.name] && !this.globalScope[node.name]) {
        this.errors.push(`Variable '${node.name}' used before declaration`);
      }
      this.checkExpr(node.value, scope, scopeName);
    } else if (node.type === 'Return') {
      this.checkExpr(node.value, scope, scopeName);
    } else if (node.type === 'IfNode') {
      this.checkExpr(node.condition, scope, scopeName);
      for (const s of node.body) this.visitStatement(s, scope, scopeName);
      if (node.elseBody) for (const s of node.elseBody) this.visitStatement(s, scope, scopeName);
    } else if (node.type === 'WhileNode') {
      this.checkExpr(node.condition, scope, scopeName);
      for (const s of node.body) this.visitStatement(s, scope, scopeName);
    } else if (node.type === 'FunctionDef') {
      this.visitFunctionDef(node);
    } else if (node.type === 'ExprStmt') {
      this.checkExpr(node.expr, scope, scopeName);
    }
  }

  checkExpr(node, scope, scopeName) {
    if (!node) return;
    if (node.type === 'Identifier') {
      if (!scope[node.name] && !this.globalScope[node.name]) {
        this.errors.push(`Undeclared variable '${node.name}' in scope '${scopeName}'`);
      }
    } else if (node.type === 'FuncCall') {
      if (!this.functions[node.name]) {
        this.errors.push(`Undefined function '${node.name}'`);
      } else {
        const expected = this.functions[node.name].params.length;
        if (node.args.length !== expected) {
          this.errors.push(`Function '${node.name}' expects ${expected} args but got ${node.args.length}`);
        }
      }
      for (const a of node.args) this.checkExpr(a, scope, scopeName);
    } else if (node.type === 'BinOp') {
      this.checkExpr(node.left, scope, scopeName);
      this.checkExpr(node.right, scope, scopeName);
    }
  }

  inferType(node, scope) {
    if (!node) return 'auto';
    if (node.type === 'Float') return 'float';
    if (node.type === 'Number') return 'int';
    if (node.type === 'BinOp') {
      const l = this.inferType(node.left, scope);
      const r = this.inferType(node.right, scope);
      if (l === 'float' || r === 'float') return 'float';
      return 'int';
    }
    if (node.type === 'Identifier' && scope[node.name]) return scope[node.name].varType || 'auto';
    return 'auto';
  }
}