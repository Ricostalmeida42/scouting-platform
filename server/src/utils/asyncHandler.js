// Envolve handlers async para que erros cheguem ao middleware de erro sem try/catch repetido.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
