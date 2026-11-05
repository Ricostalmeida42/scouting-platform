// Escapa carateres especiais de expressão regular, para pesquisas por texto
// livre (nome, liga) não rebentarem nem devolverem resultados errados quando
// o utilizador escreve '(', '[', '+', '.', etc.
export const escaparRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Normaliza um nome para comparar duplicados: sem acentos, minúsculas, espaços
// colapsados. "José  Silva " e "Jose Silva" passam a ser iguais.
export const normalizarNome = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
