const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');

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

app.post('/chat', async (req, res) => {
  try {
    const { busto, cintura, quadril, url, message } = req.body;
    console.log('➡️ Rota /chat recebeu requisição com dados:', { busto, cintura, quadril, url, message });

    const responseHtml = await axios.get(url);
    const $ = cheerio.load(responseHtml.data);

    // 🆔 Extrair ID do produto diretamente do HTML da página
    const idProduto = (() => {
      try {
        const scriptTag = $('script').filter((i, el) => $(el).html().includes('"product"')).first().html();
        const match = scriptTag.match(/"product":\s*\{\s*"id":(\d+)/);
        return match ? match[1] : null;
      } catch (e) {
        return null;
      }
    })();

    if (!idProduto) {
      return res.status(404).json({ erro: 'ID do produto não encontrado no HTML.' });
    }

    // 🔎 Buscar produto via API oficial
    const { data: produto } = await axios.get(`https://api.dooca.store/products/${idProduto}`, {
      headers: { Authorization: `Bearer ${process.env.BAGY_API_KEY}` }
    });

    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

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
          if (item['busto'] && item['cintura']) {
            tabelaMedidas.push(item);
          }
        }
      });
    });

    if (!tabelaMedidas.length) {
      return res.json({
        resposta: '',
        complemento: 'Não conseguimos encontrar a tabela de medidas na descrição do produto.'
      });
    }

    const cores = produto.variations?.map(v => v.color?.name).filter(Boolean) || [];
    const tamanhos = produto.variations?.map(v => v.attribute?.name).filter(Boolean) || [];

    const OpenAI = require('openai');
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
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Seja breve, objetivo, SEM emojis. Sempre informe o que for perguntado usando os dados acima.' },
          { role: 'user', content: promptGeral }
        ]
      });

      return res.json({
        resposta: atendimento.choices[0].message.content.trim(),
        complemento: ''
      });
    }

    const promptTamanho = `
Você é assistente de vendas de moda. Com base nestas medidas da cliente:
- Busto: ${busto} cm
- Cintura: ${cintura} cm
- Quadril: ${quadril} cm
E na tabela de medidas JSON: ${JSON.stringify(tabelaMedidas)}
Indique apenas o número do tamanho ideal (36–58).
`;

    const sizeCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Responda apenas com o número do tamanho, sem texto extra.' },
        { role: 'user', content: promptTamanho }
      ]
    });

    const tamanhoIdeal = sizeCompletion.choices[0].message.content.trim();
    const cupom = `TAM${tamanhoIdeal}`;
    const complemento = `Você está prestes para arrasar com o <strong>${nomeProduto}</strong> no tamanho <strong>${tamanhoIdeal}</strong>. Para facilitar, liberei um cupom especial:<br><strong>Código do Cupom: ${cupom}</strong> Use na finalização da compra e aproveite o desconto. Corre que é por tempo limitado!`;

    return res.json({ resposta: tamanhoIdeal, complemento });

  } catch (err) {
    console.error('❌ Erro ao processar /chat:', err);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
