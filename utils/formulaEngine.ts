import { parseSmartNumber, parseDateValue, jsToExcelDate } from './common';

type TokenType = 'NUMBER' | 'STRING' | 'FIELD' | 'IDENTIFIER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

type Evaluator = (row: any) => any;

// BOLT OPTIMIZATION: Global cache for compiled formulas
const COMPILE_CACHE = new Map<string, Evaluator>();

class FormulaCompiler {
  private pos = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private error(message: string): never {
    throw new Error(`Erreur de compilation de formule: ${message}`);
  }

  public static tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let cursor = 0;

    while (cursor < input.length) {
      const char = input[cursor];

      if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\u00A0') { cursor++; continue; }

      if (char >= '0' && char <= '9') {
        let val = '';
        while (cursor < input.length && ((input[cursor] >= '0' && input[cursor] <= '9') || input[cursor] === '.')) val += input[cursor++];
        tokens.push({ type: 'NUMBER', value: val });
        continue;
      }

      if (char === '"' || char === "'") {
        const quote = char;
        cursor++;
        let val = '';
        while (cursor < input.length) {
          if (input[cursor] === quote) {
            if (input[cursor + 1] === quote) {
              val += quote;
              cursor += 2;
              continue;
            } else {
              cursor++;
              break;
            }
          }
          val += input[cursor++];
        }
        tokens.push({ type: 'STRING', value: val });
        continue;
      }

      if (char === '[') {
        cursor++;
        let val = '';
        while (cursor < input.length && input[cursor] !== ']') val += input[cursor++];
        if (cursor >= input.length || input[cursor] !== ']') {
          throw new Error(`Erreur de syntaxe: bracket fermant ']' manquant pour le champ`);
        }
        cursor++;
        tokens.push({ type: 'FIELD', value: val });
        continue;
      }

      if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) {
        let val = '';
        while (cursor < input.length && ((input[cursor] >= 'a' && input[cursor] <= 'z') || (input[cursor] >= 'A' && input[cursor] <= 'Z') || (input[cursor] >= '0' && input[cursor] <= '9') || input[cursor] === '_')) val += input[cursor++];
        tokens.push({ type: 'IDENTIFIER', value: val.toUpperCase() });
        continue;
      }

      if (['+', '-', '*', '/', '(', ')', ',', '>', '<', '=', '!'].includes(char)) {
        const next = input[cursor + 1];
        const doubleChar = char + next;
        if (['>=', '<=', '<>', '==', '!='].includes(doubleChar)) {
          tokens.push({ type: 'OPERATOR', value: doubleChar === '==' ? '=' : doubleChar === '!=' ? '<>' : doubleChar });
          cursor += 2;
        } else {
          let type: TokenType = 'OPERATOR';
          if (char === '(') type = 'LPAREN';
          else if (char === ')') type = 'RPAREN';
          else if (char === ',') type = 'COMMA';
          tokens.push({ type, value: char });
          cursor++;
        }
        continue;
      }
      cursor++;
    }
    return tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  public compile(): Evaluator {
    this.pos = 0;
    if (this.tokens.length === 0) return () => null;
    return this.parseExpression();
  }

  private parseExpression(): Evaluator {
    let leftEval = this.parseTerm();
    while (this.peek().type === 'OPERATOR' && ['+', '-', '>', '<', '>=', '<=', '=', '<>'].includes(this.peek().value)) {
      const op = this.consume().value;
      const rightEval = this.parseTerm();
      const prevLeft = leftEval;

      if (op === '+') leftEval = (row) => parseSmartNumber(prevLeft(row)) + parseSmartNumber(rightEval(row));
      else if (op === '-') leftEval = (row) => parseSmartNumber(prevLeft(row)) - parseSmartNumber(rightEval(row));
      else if (op === '>') leftEval = (row) => prevLeft(row) > rightEval(row);
      else if (op === '<') leftEval = (row) => prevLeft(row) < rightEval(row);
      else if (op === '>=') leftEval = (row) => prevLeft(row) >= rightEval(row);
      else if (op === '<=') leftEval = (row) => prevLeft(row) <= rightEval(row);
      else if (op === '=') leftEval = (row) => prevLeft(row) == rightEval(row);
      else if (op === '<>') leftEval = (row) => prevLeft(row) != rightEval(row);
    }
    return leftEval;
  }

  private parseTerm(): Evaluator {
    let leftEval = this.parseFactor();
    while (this.peek().type === 'OPERATOR' && ['*', '/'].includes(this.peek().value)) {
      const op = this.consume().value;
      const rightEval = this.parseFactor();
      const prevLeft = leftEval;

      if (op === '*') leftEval = (row) => parseSmartNumber(prevLeft(row)) * parseSmartNumber(rightEval(row));
      else if (op === '/') leftEval = (row) => {
        const r = parseSmartNumber(rightEval(row));
        return r !== 0 ? parseSmartNumber(prevLeft(row)) / r : 0;
      };
    }
    return leftEval;
  }

  private parseFactor(): Evaluator {
    const token = this.peek();

    if (token.type === 'NUMBER') {
      const val = parseFloat(this.consume().value);
      return () => val;
    }

    if (token.type === 'STRING') {
      const val = this.consume().value;
      return () => val;
    }

    if (token.type === 'FIELD') {
      const fieldName = this.consume().value;
      return (row) => {
          const val = row[fieldName];
          return val === undefined ? null : val;
      };
    }

    if (token.type === 'IDENTIFIER') {
      return this.parseFunctionCall();
    }

    if (token.type === 'LPAREN') {
      this.consume();
      const exprEval = this.parseExpression();
      if (this.peek().type === 'RPAREN') this.consume();
      return exprEval;
    }

    if (token.type === 'OPERATOR' && token.value === '-') {
      this.consume();
      const factorEval = this.parseFactor();
      return (row) => -parseSmartNumber(factorEval(row));
    }

    this.error(`Token inattendu: ${token.type} "${token.value}"`);
  }

  private parseFunctionCall(): Evaluator {
    const funcName = this.consume().value;
    if (this.peek().type !== 'LPAREN') return () => 0;
    this.consume();

    const argEvals: Evaluator[] = [];
    if (this.peek().type !== 'RPAREN') {
      argEvals.push(this.parseExpression());
      while (this.peek().type === 'COMMA') {
        this.consume();
        argEvals.push(this.parseExpression());
      }
    }
    if (this.peek().type === 'RPAREN') this.consume();

    switch (funcName) {
      case 'SI': case 'IF':
        return (row) => argEvals[0](row) ? argEvals[1](row) : argEvals[2](row);
      case 'SOMME': case 'SUM':
        return (row) => argEvals.reduce((a, b) => a + parseSmartNumber(b(row)), 0);
      case 'MOYENNE': case 'AVG': case 'AVERAGE':
        return (row) => {
           const nums = argEvals.map(a => parseSmartNumber(a(row)));
           return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        };
      case 'MIN':
        return (row) => Math.min(...argEvals.map(n => parseSmartNumber(n(row))));
      case 'MAX':
        return (row) => Math.max(...argEvals.map(n => parseSmartNumber(n(row))));
      case 'ABS':
        return (row) => Math.abs(parseSmartNumber(argEvals[0](row)));
      case 'ARRONDI': case 'ROUND':
        return (row) => {
            const p = Math.pow(10, parseSmartNumber(argEvals[1](row)));
            return Math.round(parseSmartNumber(argEvals[0](row)) * p) / p;
        };
      case 'CONCAT': case 'CONCATENER':
        return (row) => {
           const args = argEvals.map(e => e(row));
           if (args.length > 1) {
             const lastArg = String(args[args.length - 1] || '');
             if (lastArg.length <= 3 && args.length > 2) {
               const separator = lastArg;
               return args.slice(0, -1).map(a => String(a || '')).join(separator);
             }
           }
           return args.map(a => String(a || '')).join('');
        };
      case 'REMPLACER': case 'REPLACE':
        return (row) => {
           const text = String(argEvals[0](row) || '');
           const search = String(argEvals[1](row) || '');
           const replacement = String(argEvals[2](row) || '');
           try {
             return text.replace(new RegExp(search, 'g'), replacement);
           } catch (e) { return text; }
        };
      case 'SUBSTITUER': case 'SUBSTITUTE':
        return (row) => String(argEvals[0](row) || '').split(String(argEvals[1](row) || '')).join(String(argEvals[2](row) || ''));
      case 'EXTRAIRE': case 'SUBSTRING': case 'MID':
        return (row) => {
           const text = String(argEvals[0](row) || '');
           const start = Number(argEvals[1](row) || 0);
           const length = argEvals[2] !== undefined ? Number(argEvals[2](row)) : undefined;
           return length !== undefined ? text.substring(start, start + length) : text.substring(start);
        };
      case 'GAUCHE': case 'LEFT':
        return (row) => String(argEvals[0](row) || '').substring(0, Number(argEvals[1](row) || 0));
      case 'DROITE': case 'RIGHT':
        return (row) => {
           const text = String(argEvals[0](row) || '');
           const len = Number(argEvals[1](row) || 0);
           return text.substring(text.length - len);
        };
      case 'LONGUEUR': case 'LENGTH': case 'LEN':
        return (row) => String(argEvals[0](row) || '').length;
      case 'TROUVE': case 'FIND': case 'SEARCH':
        return (row) => String(argEvals[1](row) || '').indexOf(String(argEvals[0](row) || ''), argEvals[2] !== undefined ? Number(argEvals[2](row)) : 0);
      case 'CONTIENT': case 'CONTAINS': case 'INCLUS':
        return (row) => String(argEvals[0](row) || '').includes(String(argEvals[1](row) || ''));
      case 'SUPPRESPACE': case 'TRIM': case 'NETTOYER':
        return (row) => String(argEvals[0](row) || '').trim();
      case 'MAJUSCULE': case 'UPPER':
        return (row) => String(argEvals[0](row) || '').toUpperCase();
      case 'MINUSCULE': case 'LOWER':
        return (row) => String(argEvals[0](row) || '').toLowerCase();
      case 'CAPITALISEPREMIER': case 'CAPITALIZE':
        return (row) => {
           const text = String(argEvals[0](row) || '');
           return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        };
      case 'CAPITALISEMOTS': case 'PROPER': case 'TITLE':
        return (row) => String(argEvals[0](row) || '').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      case 'AUJOURDHUI': case 'TODAY':
        return () => {
          const now = new Date();
          return jsToExcelDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
        };
      case 'ANNEE': case 'YEAR':
        return (row) => {
          const d = parseDateValue(argEvals[0](row));
          return d ? d.getUTCFullYear() : (d ? (d as Date).getFullYear() : 0);
        };
      case 'MOIS': case 'MONTH':
        return (row) => {
          const d = parseDateValue(argEvals[0](row));
          return d ? d.getUTCMonth() + 1 : (d ? (d as Date).getMonth() + 1 : 0);
        };
      case 'JOUR': case 'DAY':
        return (row) => {
          const d = parseDateValue(argEvals[0](row));
          return d ? d.getUTCDate() : (d ? (d as Date).getDate() : 0);
        };
      case 'DATE':
        return (row) => {
          const y = parseSmartNumber(argEvals[0](row));
          const m = parseSmartNumber(argEvals[1](row));
          const d = parseSmartNumber(argEvals[2](row));
          return jsToExcelDate(new Date(Date.UTC(y, m - 1, d)));
        };
      case 'DATEDIF':
        return (row) => {
          const start = parseDateValue(argEvals[0](row));
          const end = parseDateValue(argEvals[1](row));
          const unit = String(argEvals[2] ? argEvals[2](row) : 'd').toLowerCase();
          if (!start || !end) return 0;

          if (unit === 'y') {
            let years = end.getUTCFullYear() - start.getUTCFullYear();
            if (end.getUTCMonth() < start.getUTCMonth() || (end.getUTCMonth() === start.getUTCMonth() && end.getUTCDate() < start.getUTCDate())) {
              years--;
            }
            return Math.max(0, years);
          }
          if (unit === 'm') {
            let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
            if (end.getUTCDate() < start.getUTCDate()) {
              months--;
            }
            return Math.max(0, months);
          }
          // Default: days
          const diffMs = end.getTime() - start.getTime();
          return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        };
      default:
        return () => 0;
    }
  }
}

export const evaluateFormula = (row: any, formula: string, outputType?: 'number' | 'text' | 'boolean' | 'date'): number | string | boolean | null => {
  if (!formula || !formula.trim()) return null;

  try {
    let evaluator = COMPILE_CACHE.get(formula);
    if (!evaluator) {
      const tokens = FormulaCompiler.tokenize(formula);
      const compiler = new FormulaCompiler(tokens);
      evaluator = compiler.compile();
      COMPILE_CACHE.set(formula, evaluator);
    }

    const result = evaluator(row);

    if (outputType) {
      if (outputType === 'text') {
        if (result === null || result === undefined) return '';
        return String(result);
      } else if (outputType === 'boolean') {
        return Boolean(result);
      } else if (outputType === 'number') {
        const num = Number(result);
        if (!isFinite(num) || isNaN(num)) return null;
        return Math.round(num * 10000) / 10000;
      } else if (outputType === 'date') {
        const d = parseDateValue(result);
        return d ? jsToExcelDate(d) : null;
      }
    }

    if (typeof result === 'number') {
      if (!isFinite(result) || isNaN(result)) return null;
      return Math.round(result * 10000) / 10000;
    }
    return result;
  } catch (e) {
    return null;
  }
};
