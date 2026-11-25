/* Motor do 🍅 Pomodoro: só cálculo, sem tela e sem localStorage.
   O tempo entra por parâmetro (agora = Date.now()), então a contagem segue certa
   mesmo quando o Chrome atrasa os timers de abas escondidas. Testes: _testes/pomodoro-motor.test.js */
(function (raiz) {
  const MIN = 60000;
  const SONS = ['despertador', 'sino', 'suave'];

  function padrao() {
    return { foco: 20, curta: 5, longa: 15, cada: 4, auto: false, som: 'despertador', vol: 0.7 };
  }

  function num(v, min, max, pad) {
    const n = Math.round(Number(v));
    if (v === '' || v === null || v === undefined || !isFinite(n)) return pad;
    return Math.min(max, Math.max(min, n));
  }

  function limpar(cfg) {
    const p = padrao(), c = cfg || {};
    const vol = Number(c.vol);
    return {
      foco: num(c.foco, 1, 180, p.foco),
      curta: num(c.curta, 1, 180, p.curta),
      longa: num(c.longa, 1, 180, p.longa),
      cada: num(c.cada, 2, 12, p.cada),
      auto: c.auto === undefined ? p.auto : !!c.auto,
      som: SONS.includes(c.som) ? c.som : p.som,
      vol: c.vol === undefined || c.vol === '' || !isFinite(vol) ? p.vol : Math.min(1, Math.max(0, vol)),
    };
  }

  const duracao = (fase, cfg) => (cfg[fase] || 0) * MIN;

  function parar() {
    return { fase: 'parado', fim: null, pausadoRestante: null, ciclo: 0, saidas: 0, alarmeEm: null };
  }

  function iniciar(cfg, agora) {
    const c = limpar(cfg);
    return { ...parar(), fase: 'foco', fim: agora + duracao('foco', c) };
  }

  function restante(e, agora) {
    if (!e || e.fase === 'parado') return 0;
    if (e.fim == null) return Math.max(0, e.pausadoRestante || 0);
    return Math.max(0, e.fim - agora);
  }

  /* Passa para a próxima fase a partir de agora, sem acumular fases perdidas. */
  function proxima(e, cfg, agora) {
    const c = limpar(cfg);
    let fase, ciclo = e.ciclo;
    if (e.fase === 'foco') {
      ciclo += 1;
      fase = ciclo % c.cada === 0 ? 'longa' : 'curta';
    } else {
      fase = 'foco';
      if (e.fase === 'longa') ciclo = 0;
    }
    const d = duracao(fase, c);
    return {
      ...e, fase, ciclo,
      saidas: fase === 'foco' ? 0 : e.saidas,
      fim: c.auto ? agora + d : null,
      pausadoRestante: c.auto ? null : d,
    };
  }

  function avancar(e, cfg, agora) {
    if (!e || e.fase === 'parado' || e.fim == null || agora < e.fim) return { estado: e, alarmes: 0 };
    return { estado: { ...proxima(e, cfg, agora), alarmeEm: e.fim }, alarmes: 1 };
  }

  function pausar(e, agora) {
    if (!e || e.fim == null) return e;
    return { ...e, fim: null, pausadoRestante: Math.max(0, e.fim - agora) };
  }

  function retomar(e, agora) {
    if (!e || e.fase === 'parado' || e.fim != null) return e;
    return { ...e, fim: agora + (e.pausadoRestante || 0), pausadoRestante: null };
  }

  function pular(e, cfg, agora) {
    if (!e || e.fase === 'parado') return e;
    return proxima(e, cfg, agora);
  }

  /* Mudou a duração enquanto a fase espera o ▶ (ainda no início): ela passa a ter a duração nova.
     Fase já começada ou pausada no meio fica como está. */
  function reajustar(e, antes, depois) {
    if (!e || e.fase === 'parado' || e.fim != null) return e;
    const a = limpar(antes), d = limpar(depois);
    if (e.pausadoRestante !== duracao(e.fase, a)) return e;
    return { ...e, pausadoRestante: duracao(e.fase, d) };
  }

  function registrarSaida(e) {
    if (!e || e.fase !== 'foco' || e.fim == null) return e;
    return { ...e, saidas: (e.saidas || 0) + 1 };
  }

  const API = { MIN, SONS, padrao, limpar, iniciar, restante, avancar, pausar, retomar, pular, parar, reajustar, registrarSaida };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else raiz.VGPomoMotor = API;
})(typeof window !== 'undefined' ? window : this);
