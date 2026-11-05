import { useRef, useState } from 'react';

const MAX_LADO = 400; // px — chega para a ficha e mantém o ficheiro pequeno

// Lê o ficheiro escolhido e devolve um data URL já redimensionado e comprimido.
function redimensionar(ficheiro) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler o ficheiro.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ficheiro de imagem inválido.'));
      img.onload = () => {
        const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
        const l = Math.round(img.width * escala);
        const a = Math.round(img.height * escala);
        const tela = document.createElement('canvas');
        tela.width = l;
        tela.height = a;
        tela.getContext('2d').drawImage(img, 0, 0, l, a);
        resolve(tela.toDataURL('image/jpeg', 0.82));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(ficheiro);
  });
}

// Distingue um endereço web (http/https) de uma foto carregada (data URL).
const ehUrl = (v) => !!v && /^https?:\/\//i.test(v);

export default function CampoFoto({ valor, onChange }) {
  const inputRef = useRef(null);
  const [erro, setErro] = useState(null);
  const [urlPartida, setUrlPartida] = useState(false);

  const escolher = async (e) => {
    const ficheiro = e.target.files?.[0];
    if (!ficheiro) return;
    setErro(null);
    if (!ficheiro.type.startsWith('image/')) {
      setErro('Escolhe um ficheiro de imagem.');
      return;
    }
    try {
      onChange(await redimensionar(ficheiro));
    } catch (err) {
      setErro(err.message);
    }
  };

  return (
    <div className="foto-campo">
      <div className="foto-previa">
        {valor ? (
          <img
            src={valor}
            alt="Fotografia do jogador"
            onError={() => setUrlPartida(true)}
            onLoad={() => setUrlPartida(false)}
          />
        ) : (
          <span className="foto-previa__vazio sem-foto" aria-label="Sem fotografia" role="img" />
        )}
      </div>
      <div className="linha-acoes" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={escolher}
          style={{ display: 'none' }}
        />
        <button type="button" className="btn btn--secundario btn--pequeno" onClick={() => inputRef.current?.click()}>
          {valor ? 'Trocar foto (ficheiro)' : 'Escolher foto (ficheiro)'}
        </button>
        <input
          type="url"
          placeholder="ou colar endereço da imagem (https://…)"
          value={ehUrl(valor) ? valor : ''}
          onChange={(e) => {
            setErro(null);
            setUrlPartida(false);
            onChange(e.target.value.trim());
          }}
          style={{ width: '100%', minWidth: 220 }}
        />
        <small className="foto-dica">
          Um endereço (URL) guarda só o link — não ocupa espaço na base de dados.
        </small>
        {urlPartida && ehUrl(valor) && (
          <small style={{ color: 'var(--vermelho)' }}>
            Não foi possível carregar a imagem deste endereço. Confirma o link.
          </small>
        )}
        {valor && (
          <button type="button" className="btn btn--perigo btn--pequeno" onClick={() => onChange('')}>
            Remover
          </button>
        )}
        {erro && <small style={{ color: 'var(--vermelho)' }}>{erro}</small>}
      </div>
    </div>
  );
}
