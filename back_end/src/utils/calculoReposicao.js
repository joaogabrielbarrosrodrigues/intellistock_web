/**
 * Regras de análise de consumo e sugestão de reposição
 * (mesmas fórmulas do InteliStock mobile).
 *
 * - O período de análise é dividido em duas metades (antiga e recente).
 * - Tendência ALTA/BAIXA quando a média recente varia 10% ou mais em relação à antiga.
 * - Estoque de segurança = maior valor entre o mínimo cadastrado e (consumo x dias de segurança).
 * - Ponto de pedido      = consumo x prazo de entrega + estoque de segurança.
 * - Necessidade          = consumo x (dias de cobertura + prazo) + segurança - estoque atual.
 */

const PADROES = {
  diasAnalise: 30,
  diasCobertura: 30,
  prazoEntrega: 7,
  diasSeguranca: 7,
  limiarTendencia: 10,
};

const UNIDADES_CONTAVEIS = ['UN', 'CX', 'PCT', 'FD'];
const ORDEM_PRIORIDADE = { ALTA: 0, MEDIA: 1, BAIXA: 2, NENHUMA: 3 };

function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

/** Divide o período em metade antiga e metade recente. */
function janela(dias) {
  const diasAntigos = Math.floor(dias / 2);
  return { dias, diasAntigos, diasRecentes: dias - diasAntigos };
}

/** Calcula médias e tendência a partir do total consumido em cada metade. */
function calcularConsumo(totalAntigo, totalRecente, { dias, diasAntigos, diasRecentes }) {
  const total = totalAntigo + totalRecente;
  const mediaDiaria = arredondar(total / dias, 3);
  const mediaRecente = arredondar(totalRecente / diasRecentes, 3);

  let tendencia = 'ESTAVEL';
  let variacaoPercentual = null;
  if (diasAntigos > 0) {
    const mediaAntiga = totalAntigo / diasAntigos;
    const mediaRecentePrecisa = totalRecente / diasRecentes;
    if (mediaAntiga === 0) {
      tendencia = mediaRecentePrecisa > 0 ? 'ALTA' : 'ESTAVEL';
    } else {
      variacaoPercentual = arredondar(((mediaRecentePrecisa - mediaAntiga) * 100) / mediaAntiga, 1);
      if (variacaoPercentual >= PADROES.limiarTendencia) tendencia = 'ALTA';
      else if (variacaoPercentual <= -PADROES.limiarTendencia) tendencia = 'BAIXA';
    }
  }
  return { total: arredondar(total, 3), mediaDiaria, mediaRecente, tendencia, variacaoPercentual };
}

/** Aplica as fórmulas de reposição a um produto. */
function calcularReposicao(produto, consumo, { diasCobertura, prazoEntrega, diasSeguranca }) {
  const estoqueAtual = produto.quantidade;
  const base = consumo.tendencia === 'ALTA' ? Math.max(consumo.mediaDiaria, consumo.mediaRecente) : consumo.mediaDiaria;
  const minimoCalculado = arredondar(base * diasSeguranca, 3);
  const estoqueSeguranca = Math.max(produto.estoqueMinimo, minimoCalculado);
  const pontoPedido = arredondar(base * prazoEntrega + estoqueSeguranca, 3);
  const necessidade = Math.max(0, base * (diasCobertura + prazoEntrega) + estoqueSeguranca - estoqueAtual);
  const precisaRepor = estoqueAtual <= pontoPedido && necessidade > 0;

  let quantidadeSugerida = 0;
  if (precisaRepor) {
    // Itens contáveis (caixa, pacote...) são arredondados para cima em números inteiros.
    quantidadeSugerida = UNIDADES_CONTAVEIS.includes(produto.unidadeMedida)
      ? Math.ceil(arredondar(necessidade, 6))
      : Math.ceil(arredondar(necessidade * 1000, 6)) / 1000;
  }

  const diasRestantes = base > 0 ? arredondar(estoqueAtual / base, 1) : null;

  let prioridade = 'NENHUMA';
  if (precisaRepor) {
    if (estoqueAtual === 0 || (diasRestantes !== null && diasRestantes <= prazoEntrega)) prioridade = 'ALTA';
    else if (estoqueAtual <= estoqueSeguranca) prioridade = 'MEDIA';
    else prioridade = 'BAIXA';
  }

  return {
    consumoBase: arredondar(base, 3),
    minimoCalculado,
    estoqueSeguranca,
    pontoPedido,
    diasRestantes,
    precisaRepor,
    quantidadeSugerida,
    custoEstimado: arredondar(quantidadeSugerida * produto.preco, 2),
    prioridade,
  };
}

/** Ordena: prioridade, depois quem acaba primeiro, depois nome. */
function ordenarSugestoes(a, b) {
  const p = ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade];
  if (p !== 0) return p;
  if (a.diasRestantes !== b.diasRestantes) {
    if (a.diasRestantes === null) return 1;
    if (b.diasRestantes === null) return -1;
    return a.diasRestantes - b.diasRestantes;
  }
  return a.produtoNome.localeCompare(b.produtoNome, 'pt-BR');
}

module.exports = { PADROES, janela, calcularConsumo, calcularReposicao, ordenarSugestoes };
