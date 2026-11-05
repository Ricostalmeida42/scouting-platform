// OBSOLETA — NÃO CORRER. Esta migração foi escrita para o design ANTIGO, em que o
// ratingFinal do jogador era derivado de `j.avaliacao` (calcularRatingFinal). Nesse
// modelo já não existe: o ratingFinal é a MÉDIA dos ratings das observações
// (server/src/routes/observations.js → mediaObservacoes). Correr o recálculo antigo
// sobrescreveria o rating correto com um valor stale de j.avaliacao.
//
// Para recalcular a nota final a partir das observações, usar:  node src/migrarRatings.js
console.error(
  '[migração 002] OBSOLETA — não corre (usaria a fórmula antiga e corromperia o ratingFinal).\n' +
    'Para recalcular pela média das observações: node src/migrarRatings.js'
);
process.exit(1);
