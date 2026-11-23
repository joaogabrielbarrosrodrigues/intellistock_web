/**
 * Funções de validação dos dados recebidos nas requisições.
 * Cada função devolve o valor já tratado ou lança um AppError (HTTP 400).
 */
const AppError = require('./AppError');

const VALOR_MAXIMO = 999999999999;
const UNIDADES = ['UN', 'KG', 'G', 'L', 'ML', 'M', 'CX', 'PCT', 'FD'];

function vazio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === '';
}

function texto(valor, campo, { obrigatorio = false, max = 255 } = {}) {
  if (vazio(valor)) {
    if (obrigatorio) throw new AppError(400, `${campo} é obrigatório.`);
    return null;
  }
  const limpo = String(valor).trim();
  if (limpo.length > max) throw new AppError(400, `${campo} deve ter no máximo ${max} caracteres.`);
  return limpo;
}

function numero(valor, campo, { obrigatorio = false, min = 0, maiorQueZero = false, padrao = null, max = VALOR_MAXIMO } = {}) {
  if (vazio(valor)) {
    if (obrigatorio) throw new AppError(400, `${campo} é obrigatório.`);
    return padrao;
  }
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n)) throw new AppError(400, `${campo} deve ser um número válido.`);
  if (maiorQueZero && n <= 0) throw new AppError(400, `${campo} deve ser maior que zero.`);
  if (n < min) throw new AppError(400, `${campo} não pode ser menor que ${min}.`);
  if (n > max) throw new AppError(400, `${campo} não pode ser maior que ${max}.`);
  return n;
}

function inteiro(valor, campo, { obrigatorio = false, min = 1, max = 3650, padrao = null } = {}) {
  const n = numero(valor, campo, { obrigatorio, min, max, padrao });
  if (n !== null && !Number.isInteger(n)) throw new AppError(400, `${campo} deve ser um número inteiro.`);
  return n;
}

function id(valor, campo = 'ID', { obrigatorio = true } = {}) {
  if (vazio(valor)) {
    if (obrigatorio) throw new AppError(400, `${campo} é obrigatório.`);
    return null;
  }
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647) throw new AppError(400, `${campo} inválido.`);
  return n;
}

function data(valor, campo, { obrigatorio = false } = {}) {
  if (vazio(valor)) {
    if (obrigatorio) throw new AppError(400, `${campo} é obrigatória.`);
    return null;
  }
  const texto = String(valor).trim();
  const d = new Date(`${texto}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== texto) {
    throw new AppError(400, `${campo} inválida. Use o formato AAAA-MM-DD.`);
  }
  return texto;
}

function email(valor, campo = 'E-mail', { obrigatorio = false } = {}) {
  const limpo = texto(valor, campo, { obrigatorio, max: 180 });
  if (limpo === null) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) throw new AppError(400, `${campo} inválido.`);
  return limpo.toLowerCase();
}

function opcao(valor, campo, opcoes, { obrigatorio = false } = {}) {
  if (vazio(valor)) {
    if (obrigatorio) throw new AppError(400, `${campo} é obrigatório.`);
    return null;
  }
  const v = String(valor).trim().toUpperCase();
  if (!opcoes.includes(v)) throw new AppError(400, `${campo} inválido. Use: ${opcoes.join(', ')}.`);
  return v;
}

/** Valida CNPJ (somente dígitos verificadores) e devolve só os números. */
function cnpj(valor) {
  if (vazio(valor)) return null;
  const digitos = String(valor).replace(/\D/g, '');
  if (digitos.length !== 14 || /^(\d)\1{13}$/.test(digitos)) throw new AppError(400, 'CNPJ inválido.');
  const calcular = (base) => {
    let soma = 0;
    let peso = base.length - 7;
    for (const c of base) {
      soma += Number(c) * peso--;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calcular(digitos.slice(0, 12));
  const d2 = calcular(digitos.slice(0, 12) + d1);
  if (digitos !== digitos.slice(0, 12) + d1 + d2) throw new AppError(400, 'CNPJ inválido.');
  return digitos;
}

module.exports = { texto, numero, inteiro, id, data, email, opcao, cnpj, UNIDADES };
