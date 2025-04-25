import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (a pasta onde estão index.html e widget.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname);
app.use(express.static(rootDir));

// Rota principal: serve o widget
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.post('/chat', async (req, res) => {
  try {
    const { busto, cintura, quadril, url, message } = req.body;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Extrai nome e descrição do produto
    const nomeProduto = $('.product-info-content h1').first().text().trim();
    const descricao = $('#product-description').text().trim();

    // Monta tabela de medidas (versão inteligente)
    let tabelaMedidas = [];
    $('table').each((_, tabela) => {
      let headers = [];
      let foundHeader = false;
      $(tabela).find('tr').each((i, row) => {
        const cells = $(row).find('td, th');
        const cellTexts = cells.map((_, cell) => $(cell).text().trim().toLowerCase()).get();

        // Identifica a linha do cabeçalho
        if (!foundHeader && cellTexts.includes('busto') && cellTexts.includes('cintura')) {
          headers = cellTexts;
          foundHeader = true;
          return;
        }

        // Só processa linhas após o cabeçalho
        if (foundHeader && cells.length === headers.length) {
          const values = {};
          cells.each((j, cell) => {
            const key = headers[j];
            if (key) values[key] = $(cell).text().trim();
          });
          if (values['busto'] && values['cintura']) tabelaMedidas.push(values);
        }
      });
    });

    // Se não houver tabela, retorna erro amigável
    if (!tabelaMedidas.length) {
      return res.json({
        resposta: '',
        complemento: 'Não consigo fornecer uma recomendação de tamanho sem a tabela de medidas.'
      });
    }

    // Extrai cores disponíveis
    const cores = $('.variant-item').map((_, el) => $(el).text().trim()).get();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Fluxo de dúvidas
    if (message) {
      const promptGeral = `
Você é um vendedor especialista da ${nomeLoja || 'Sua Loja'}.
Produto: ${nomeProduto}
Descrição: ${descricao}
Cores: ${cores.join(', ')}
Tabela de medidas: ${JSON.stringify(tabelaMedidas)}

Dúvida: "${message}"
`;
      const atendimento = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Seja breve e direto, sem emojis.' },
          { role: 'user', content: promptGeral }
        ]
      });

      return res.json({
        resposta: atendimento.choices[0].message.content.trim(),
        complemento: ''
      });
    }

    // Fluxo de recomendação de tamanho
    const promptTamanho = `
Você é assistente de vendas de moda. Com base nestas medidas da cliente:
- Busto: ${busto} cm
- Cintura: ${cintura} cm
- Quadril: ${quadril} cm
E na tabela de medidas JSON: ${JSON.stringify(tabelaMedidas)}
Indique apenas o número do tamanho ideal (36–58).
Nunca envie a tabela de medidas na tela do chat, apenas respostas caso seja questionado tamanhos disponível.
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

    return res.json({
      resposta: tamanhoIdeal,
      complemento
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
