import { DataRow } from '../types';
import { parseSmartNumber } from './common';

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'FIELD'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

// BOLT OPTIMIZATION: Global cache for tokenized formulas to avoid repeated parsing
const FORMULA_CACHE = new Map<string, Token[]>();

class FormulaParser {
  private pos = 0;
  private tokens: Token[];
  private row: DataRow;

  constructor(tokens: Token[], row: DataRow) {
    this.tokens = tokens;
    this.row = row;
  }

  private error(message: string): never {
    throw new Error(`Erreur de formule: ${message}`);
  }

  public static tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let cursor = 0;

    while (cursor < input.length) {
      const char = input[cursor];

      // BOLT OPTIMIZATION: Faster whitespace check (including non-breaking space for FR format)
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\u00A0') {
        cursor++;
        continue;
      }

      // BOLT OPTIMIZATION: Faster digit check
      if (char >= '0' && char <= '9') {
        let val = '';
        while (
          cursor < input.length &&
          ((input[cursor] >= '0' && input[cursor] <= '9') || input[cursor] === '.')
        )
          val += input[cursor++];
        tokens.push({ type: 'NUMBER', value: val });
        continue;
      }

      if (char === '"' || char === "'") {
        const quote = char;
        cursor++;
        let val = '';
        while (cursor < input.length) {
          if (input[cursor] === quote) {
            // Check for escaped quote (double quote)
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

        // Vérifier que le bracket fermant a bien été trouvé
        if (cursor >= input.length || input[cursor] !== ']') {
          throw new Error(`Erreur de syntaxe: bracket fermant ']' manquant pour le champ`);
        }

        cursor++; // Consommer le ']'
        tokens.push({ type: 'FIELD', value: val });
        continue;
      }

      if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) {
        let val = '';
        while (
          cursor < input.length &&
          ((input[cursor] >= 'a' && input[cursor] <= 'z') ||
            (input[cursor] >= 'A' && input[cursor] <= 'Z') ||
            (input[cursor] >= '0' && input[cursor] <= '9') ||
            input[cursor] === '_')
        )
          val += input[cursor++];
        tokens.push({ type: 'IDENTIFIER', value: val.toUpperCase() });
        continue;
      }

      if (['+', '-', '*', '/', '(', ')', ',', '>', '<', '=', '!'].includes(char)) {
        const next = input[cursor + 1];
        const doubleChar = char + next;
        if (['>=', '<=', '<>', '==', '!='].includes(doubleChar)) {
          tokens.push({
            type: 'OPERATOR',
            value: doubleChar === '==' ? '=' : doubleChar === '!=' ? '<>' : doubleChar
          });
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

  public evaluate(): string | number | boolean | null {
    this.pos = 0;
    if (this.tokens.length === 0) return null;
    return this.parseExpression();
  }

  private parseExpression(): string | number | boolean | null {
    let left = this.parseTerm();
    while (
      this.peek().type === 'OPERATOR' &&
      ['+', '-', '>', '<', '>=', '<=', '=', '<>'].includes(this.peek().value)
    ) {
      const op = this.consume().value;
      const right = this.parseTerm();
      if (op === '+') left = parseSmartNumber(left as any) + parseSmartNumber(right as any);
      else if (op === '-') left = parseSmartNumber(left as any) - parseSmartNumber(right as any);
      else if (op === '>') left = (left as any) > (right as any);
      else if (op === '<') left = (left as any) < (right as any);
      else if (op === '>=') left = (left as any) >= (right as any);
      else if (op === '<=') left = (left as any) <= (right as any);
      else if (op === '=') left = (left as any) == (right as any);
      else if (op === '<>') left = (left as any) != (right as any);
    }
    return left;
  }

  private parseTerm(): string | number | boolean | null {
    let left = this.parseFactor();
    while (this.peek().type === 'OPERATOR' && ['*', '/'].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseFactor();
      if (op === '*') left = parseSmartNumber(left as any) * parseSmartNumber(right as any);
      else if (op === '/') {
        const r = parseSmartNumber(right as any);
        left = r !== 0 ? parseSmartNumber(left as any) / r : 0;
      }
    }
    return left;
  }

  private parseFactor(): string | number | boolean | null {
    const token = this.peek();

    if (token.type === 'NUMBER') {
      this.consume();
      return parseFloat(token.value);
    }

    if (token.type === 'STRING') {
      this.consume();
      return token.value;
    }

    if (token.type === 'FIELD') {
      this.consume();
      const val = this.row[token.value];
      // Retourner la valeur brute, les opérateurs et fonctions se chargeront de la conversion si nécessaire
      return val === undefined ? null : val;
    }

    if (token.type === 'IDENTIFIER') {
      return this.parseFunctionCall();
    }

    if (token.type === 'LPAREN') {
      this.consume();
      const expr = this.parseExpression();
      if (this.peek().type === 'RPAREN') this.consume();
      return expr;
    }

    // Unary minus
    if (token.type === 'OPERATOR' && token.value === '-') {
      this.consume();
      return -this.parseFactor();
    }

    // Token invalide : lever une exception au lieu de retourner 0
    this.error(`Token inattendu: ${token.type} "${token.value}"`);
  }

  private parseFunctionCall(): string | number | boolean | null {
    const funcName = this.consume().value;
    if (this.peek().type !== 'LPAREN') return 0;
    this.consume(); // (

    const args: (string | number | boolean | null)[] = [];
    if (this.peek().type !== 'RPAREN') {
      args.push(this.parseExpression());
      while (this.peek().type === 'COMMA') {
        this.consume();
        args.push(this.parseExpression());
      }
    }
    if (this.peek().type === 'RPAREN') this.consume();

    // Dispatch Function
    switch (funcName) {
      case 'SI':
      case 'IF':
        return args[0] ? args[1] : args[2];
      case 'SOMME':
      case 'SUM':
        return args.reduce((a, b) => a + parseSmartNumber(b), 0);
      case 'MOYENNE':
      case 'AVG':
      case 'AVERAGE':
        const nums = args.map((a) => parseSmartNumber(a));
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      case 'MIN':
        return Math.min(...args.map((n) => parseSmartNumber(n)));
      case 'MAX':
        return Math.max(...args.map((n) => parseSmartNumber(n)));
      case 'ABS':
        return Math.abs(parseSmartNumber(args[0]));
      case 'ARRONDI':
      case 'ROUND':
        const p = Math.pow(10, parseSmartNumber(args[1]));
        return Math.round(parseSmartNumber(args[0]) * p) / p;

      // --- STRING FUNCTIONS ---
      case 'CONCAT':
      case 'CONCATENER':
        // CONCAT(texte1, texte2, ..., séparateur_optionnel)
        if (args.length > 1) {
          const lastArg = String(args[args.length - 1] || '');
          if (lastArg.length <= 3 && args.length > 2) {
            const separator = lastArg;
            return args
              .slice(0, -1)
              .map((a) => String(a || ''))
              .join(separator);
          }
        }
        return args.map((a) => String(a || '')).join('');

      case 'REMPLACER':
      case 'REPLACE':
        const text = String(args[0] || '');
        const search = String(args[1] || '');
        const replacement = String(args[2] || '');
        try {
          return text.replace(new RegExp(search, 'g'), replacement);
        } catch (e) {
          console.warn(`Regex invalide: ${search}`);
          return text;
        }

      case 'SUBSTITUER':
      case 'SUBSTITUTE':
        const textSub = String(args[0] || '');
        const oldText = String(args[1] || '');
        const newText = String(args[2] || '');
        return textSub.split(oldText).join(newText);

      case 'EXTRAIRE':
      case 'SUBSTRING':
      case 'MID':
        const textExt = String(args[0] || '');
        const start = Number(args[1] || 0);
        const length = args[2] !== undefined ? Number(args[2]) : undefined;
        return length !== undefined
          ? textExt.substring(start, start + length)
          : textExt.substring(start);

      case 'GAUCHE':
      case 'LEFT':
        const textLeft = String(args[0] || '');
        const leftLen = Number(args[1] || 0);
        return textLeft.substring(0, leftLen);

      case 'DROITE':
      case 'RIGHT':
        const textRight = String(args[0] || '');
        const rightLen = Number(args[1] || 0);
        return textRight.substring(textRight.length - rightLen);

      case 'LONGUEUR':
      case 'LENGTH':
      case 'LEN':
        return String(args[0] || '').length;

      case 'TROUVE':
      case 'FIND':
      case 'SEARCH':
        const searchText = String(args[0] || '');
        const textFind = String(args[1] || '');
        const startPos = args[2] !== undefined ? Number(args[2]) : 0;
        const index = textFind.indexOf(searchText, startPos);
        return index;

      case 'CONTIENT':
      case 'CONTAINS':
      case 'INCLUS':
        const textContains = String(args[0] || '');
        const searchContains = String(args[1] || '');
        return textContains.includes(searchContains);

      case 'SUPPRESPACE':
      case 'TRIM':
      case 'NETTOYER':
        return String(args[0] || '').trim();

      case 'MAJUSCULE':
      case 'UPPER':
        return String(args[0] || '').toUpperCase();

      case 'MINUSCULE':
      case 'LOWER':
        return String(args[0] || '').toLowerCase();

      case 'CAPITALISEPREMIER':
      case 'CAPITALIZE':
        const textCap = String(args[0] || '');
        return textCap.charAt(0).toUpperCase() + textCap.slice(1).toLowerCase();

      case 'CAPITALISEMOTS':
      case 'PROPER':
      case 'TITLE':
        const textProper = String(args[0] || '');
        return textProper
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

      default:
        return 0;
    }
  }
}

/**
 * Évalue une formule de manière sécurisée sans utiliser eval() ni new Function()
 */
export const evaluateFormula = (
  row: DataRow,
  formula: string,
  outputType?: 'number' | 'text' | 'boolean'
): number | string | boolean | null => {
  if (!formula || !formula.trim()) return null;

  try {
    let tokens = FORMULA_CACHE.get(formula);
    if (!tokens) {
      tokens = FormulaParser.tokenize(formula);
      FORMULA_CACHE.set(formula, tokens);
    }

    const parser = new FormulaParser(tokens, row);
    let result = parser.evaluate();

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
