import { evaluate } from '../src/calculator';

describe('evaluate', () => {
  test('opérations de base et symboles de la calculatrice', () => {
    expect(evaluate('2+3')).toBe(5);
    expect(evaluate('7×8')).toBe(56);
    expect(evaluate('10÷4')).toBe(2.5);
    expect(evaluate('5−9')).toBe(-4);
    expect(evaluate('50%')).toBe(0.5);
    expect(evaluate('12.5+0.5')).toBe(13);
    expect(evaluate('(2+3)×4')).toBe(20);
    expect(evaluate('2+3×4')).toBe(14); // priorité des opérateurs
    expect(evaluate('1234')).toBe(1234);
  });

  test('entrées invalides renvoient null', () => {
    expect(evaluate('÷÷')).toBeNull();
    expect(evaluate('')).toBeNull();
    expect(evaluate('2+')).toBeNull(); // expression incomplète
    expect(evaluate('abc')).toBeNull();
    expect(evaluate('1/0')).toBeNull(); // division par zéro → Infinity rejeté
  });
});
