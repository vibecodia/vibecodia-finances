import axios from 'axios';

import { logger } from '../utils/logger.js';

// Função auxiliar para limpar HTML tags e entidades
const cleanText = (text) => {
  if (!text) return '';
  return text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
};

// Busca e parseia os dados de uma nota fiscal (SEFAZ SP, PR, SC).
// Toda a lógica de parsing (regex e categorização) foi copiada byte a byte do
// server.js original — nenhuma "melhoria" aqui para não mudar comportamento.
export async function fetchReceiptData(rawUrl) {
  // Sanitizar URL: o pipe "|" às vezes vem codificado ou causa problemas em certos ambientes
  let sanitizedUrl = rawUrl.toString().replace(/%7C/g, '|');

  // Mapear URLs curtas de SP para a URL completa de consulta, conforme sugerido
  if (sanitizedUrl.includes('nfce.fazenda.sp.gov.br/qrcode')) {
    sanitizedUrl = sanitizedUrl.replace('/qrcode', '/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx');
  }

  let response;
  try {
    // Configurar timeout e headers para evitar bloqueios básicos
    response = await axios.get(sanitizedUrl, {
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar dados da SEFAZ:', error.message);
    const err = new Error('Não foi possível ler os dados da SEFAZ diretamente. Verifique a conexão ou o link.');
    err.status = 500;
    err.extra = { details: error.message };
    throw err;
  }

  if (response.status !== 200) {
    logger.warn(`⚠️ SEFAZ respondeu com status ${response.status}`);
  }

  const html = response.data;

  let storeName = 'Estabelecimento Desconhecido';
  let totalAmount = 0;
  let date = new Date().toISOString().split('T')[0];
  let itemsList = [];

  // --- LÓGICA DE PARSING REFORÇADA ---

  // 1. Nome do Estabelecimento (Busca por txtTopo ou id u20)
  const storeMatch = html.match(/class="txtTopo"[^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/id="u20"[^>]*>([\s\S]*?)<\/div>/i);
  if (storeMatch) {
    storeName = cleanText(storeMatch[1]);
  }

  // 2. Valor Total (Busca pela classe txtMax ou rótulo Valor a Pagar)
  const amountMatch = html.match(/txtMax[^>]*>([\s\S]*?)<\/span>/i) ||
                      html.match(/Valor a pagar[\s\S]*?totalNumb[^>]*>([\s\S]*?)<\/span>/i) ||
                      html.match(/Valor total[\s\S]*?totalNumb[^>]*>([\s\S]*?)<\/span>/i);

  if (amountMatch) {
    const rawValue = cleanText(amountMatch[1]);
    totalAmount = parseFloat(rawValue.replace(/\./g, '').replace(',', '.')) || 0;
  }

  // 3. Data da Emissão
  const dateMatch = html.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('/');
    date = `${year}-${month}-${day}`;
  }

  // 4. Itens da Nota (Regex focado na classe txtTit e valor)
  // Tenta capturar o bloco de cada item
  const itemRegex = /<span class="txtTit">([\s\S]*?)<\/span>[\s\S]*?Qtde\.:<\/strong>([\s\S]*?)<\/span>[\s\S]*?class="valor">([\s\S]*?)<\/span>/gis;
  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    const name = cleanText(match[1]);
    const qty = parseFloat(cleanText(match[2]).replace(',', '.')) || 1;
    const price = parseFloat(cleanText(match[3]).replace(/\./g, '').replace(',', '.')) || 0;

    itemsList.push({
      description: name,
      qty: qty,
      unitPrice: price,
      totalItemPrice: (qty * price)
    });
  }

  // 4.1 Extrair Descontos (se houver)
  const discountMatch = html.match(/(?:Descontos R\$:|Você economizou nessa compra R\$)[\s\S]*?totalNumb[^>]*>([\s\S]*?)<\/span>/i);
  if (discountMatch) {
    const discountVal = parseFloat(cleanText(discountMatch[1]).replace(/\./g, '').replace(',', '.')) || 0;
    if (discountVal > 0) {
      itemsList.push({
        description: "(-) DESCONTOS TOTAIS",
        qty: 1,
        unitPrice: -discountVal,
        totalItemPrice: -discountVal
      });
    }
  }

  // Fallback para itens se o primeiro falhar
  if (itemsList.length === 0) {
    const fallbackRegex = /class="txtNome">([\s\S]*?)<\/span>[\s\S]*?class="valor">([\s\S]*?)<\/span>/gis;
    while ((match = fallbackRegex.exec(html)) !== null) {
      const name = cleanText(match[1]);
      const price = parseFloat(cleanText(match[2]).replace(/\./g, '').replace(',', '.')) || 0;
      itemsList.push({ description: name, qty: 1, unitPrice: price, totalItemPrice: price });
    }
  }

  // 5. Categorização
  let category = 'Outros';
  const storeUpper = storeName.toUpperCase();
  if (storeUpper.match(/MERCADO|SUPERMERCADO|ATACAREJO|REDE MARIAS|PAO DE ACUCAR|CARREFOUR|ASSAI|ZAFFARI|CONFIANCA|DALBEN|CONFIANÇA/)) {
    category = 'Mercado';
  } else if (storeUpper.match(/POSTO|SHELL|IPIRANGA|BR|PETROBRAS|COMBUSTIVEL/)) {
    category = 'Transporte';
  } else if (storeUpper.match(/FARMACIA|DROGARIA|RAIA|DROGASIL|SAO PAULO|PANVEL/)) {
    category = 'Saúde';
  } else if (storeUpper.match(/RESTAURANTE|LANCHONETE|IFOOD|BURGER KING|MC DONALDS|PIZZA|CAFE/)) {
    category = 'Alimentação';
  } else if (storeUpper.match(/PET|VETERINARIA|COBASI|PETZ/)) {
    category = 'Pets';
  }

  const notes = itemsList.length > 0
    ? { version: "1.0", source: "SEFAZ", store: storeName, items: itemsList }
    : 'Dados detalhados dos itens não disponíveis.';

  return {
    success: true,
    data: { description: storeName, amount: totalAmount, date: date, category: category, notes: notes, type: 'expense' }
  };
}
