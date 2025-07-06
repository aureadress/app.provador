// index.js reestruturado com proteções e melhorias
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const OpenAI = require('openai');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const rootDir = __dirname;
app.use(express.static(rootDir));

app.get('/', (req, res) => {
  console.log('➡️ Rota principal acessada');
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Função auxiliar para limpar URL
const limparURL = (url) => url?.replace(/;$/, '').trim();

// Função auxiliar para extrair ID do HTML do produto
async function extrairIdProduto(url) {
  try {
    const responseHtml = await axios.get(limparURL(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(responseHtml.data);
    const scriptTag = $('script').filter((i, el) => $(el).html().includes('product')).first().html();
    const match = scriptTag && scriptTag.match(/"id":\s*(\d+),\s*"name":/);
    return match ? match[1] : null;
  } catch (err) {
    console.error('Erro ao extrair ID do produto:', err.message);
    return null;
  }
}

app.post('/chat', async (req, res) => {
  try {
    const { busto, cintura, quadril, url, idProduto, message } = req.body;
    console.log('➡️ Rota /chat recebeu requisição com dados:', { busto, cintura, quadril, url, idProduto, message });

    let produtoId = idProduto;
    if (!produtoId && url) produtoId = await extrairIdProduto(url);
    if (!produtoId) return res.status(404).json({ erro: 'ID do produto não encontrado.' });

    const { data: produto } = await axios.get(`https://api.dooca.store/products/${produtoId}`, {
      headers: { Authorization: `Bearer ${process.env.BAGY_API_KEY}` }
    });

    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado na API.' });

    const nomeProduto = produto.name;
    const descricao = produto.description || '';

    const dom = new JSDOM(descricao);
    const doc = dom.window.document;
    let tabelaMedidas = [];

    doc.querySelectorAll('table').forEach(tabela => {
      const rows = Array.from(tabela.querySelectorAll('tr'));
      let headers = [];
      let encontrouCabecalho = false;

      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim().toLowerCase());

        if (!encontrouCabecalho && cells.includes('busto') && cells.includes('cintura')) {
          headers = cells;
          encontrouCabecalho = true;
          return;
        }

        if (encontrouCabecalho && cells.length === headers.length) {
          const item = {};
          cells.forEach((valor, idx) => {
            item[headers[idx]] = valor;
          });
          if (item['busto'] && item['cintura']) tabelaMedidas.push(item);
        }
      });
    });

    if (!tabelaMedidas.length) {
      return res.json({ resposta: '', complemento: 'Não conseguimos encontrar a tabela de medidas na descrição do produto.' });
    }

    const cores = produto.variations?.map(v => v.color?.name).filter(Boolean) || [];
    const tamanhos = produto.variations?.map(v => v.attribute?.name).filter(Boolean) || [];

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (message) {
      const promptGeral = `
Você é um vendedor especialista da loja Aurea Dress.
Produto: ${nomeProduto}
Descrição: ${descricao.replace(/<[^>]*>/g, '')}
Cores: ${cores.join(', ')}
Tamanhos: ${tamanhos.join(', ')}
Tabela de medidas: ${JSON.stringify(tabelaMedidas)}

Dúvida: "${message}"

REGRAS:
- Sempre responda dúvidas de forma breve e clara.
- Nunca diga que não sabe, utilize os dados acima.`;

      const atendimento = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Seja breve, objetivo, SEM emojis. Sempre informe o que for perguntado usando os dados acima.' },
          { role: 'user', content: promptGeral }
        ]
      });

      return res.json({ resposta: atendimento.choices[0].message.content.trim(), complemento: '' });
    }

    const promptTamanho = `Com base nas medidas:
Busto: ${busto} cm
Cintura: ${cintura} cm
Quadril: ${quadril} cm
E na tabela de medidas: ${JSON.stringify(tabelaMedidas)}

Qual o tamanho ideal (responda apenas com o número)?`;

    const sizeCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Responda apenas com o número do tamanho, sem texto extra.' },
        { role: 'user', content: promptTamanho }
      ]
    });

    const tamanhoIdeal = sizeCompletion.choices[0].message.content.trim();
    const cupom = `TAM${tamanhoIdeal}`;
    const complemento = `Você está prestes para arrasar com o <strong>${nomeProduto}</strong> no tamanho <strong>${tamanhoIdeal}</strong>. Para facilitar, liberei um cupom especial:<br><strong>Código do Cupom: ${cupom}</strong> Use na finalização da compra e aproveite o desconto.`;

    return res.json({ resposta: tamanhoIdeal, complemento });

  } catch (err) {
    console.error('❌ Erro ao processar /chat:', err);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
