// Évaluateur d'expressions arithmétiques pour l'écran camouflé, sans
// eval() : uniquement chiffres, point décimal, parenthèses et les quatre
// opérations (plus le pourcentage). Renvoie null pour toute entrée
// invalide. Isolé ici pour être testable indépendamment de l'UI.
export function evaluate(expression) {
  const sanitized = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/%/g, '/100');
  if (!/^[0-9+\-*/. ()]+$/.test(sanitized)) {
    return null;
  }
  const tokens = sanitized.match(/(\d+\.?\d*|[+\-*/()])/g);
  if (!tokens) {
    return null;
  }
  let position = 0;
  const peek = () => tokens[position];
  const next = () => tokens[position++];

  const parsePrimary = () => {
    if (peek() === '(') {
      next();
      const value = parseAddition();
      if (peek() === ')') {
        next();
      }
      return value;
    }
    if (peek() === '-') {
      next();
      return -parsePrimary();
    }
    return parseFloat(next());
  };
  const parseMultiplication = () => {
    let value = parsePrimary();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const right = parsePrimary();
      value = op === '*' ? value * right : value / right;
    }
    return value;
  };
  function parseAddition() {
    let value = parseMultiplication();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const right = parseMultiplication();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  const result = parseAddition();
  // Rejette une expression incomplète ou mal formée (tokens restants).
  if (position !== tokens.length || !Number.isFinite(result)) {
    return null;
  }
  return result;
}
