// Classificação Rendimento (R) e Potencial (P) — os maiores classificadores do
// jogador, presentes em toda a plataforma (não só no relatório). Dois quadrados
// pretos, como no relatório. `onda` = variante maior para a ficha do jogador.
export default function BadgesRP({ rendimento, potencial, grande = false }) {
  const sq = (v, titulo) => (
    <b className={'badge-rp' + (v ? '' : ' vazio') + (grande ? ' badge-rp--grande' : '')} title={titulo}>
      {v || '–'}
    </b>
  );
  return (
    <span className="badges-rp">
      {sq(rendimento, 'Rendimento')}
      {sq(potencial, 'Potencial')}
    </span>
  );
}
