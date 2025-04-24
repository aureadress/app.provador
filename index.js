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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname);
app.use(express.static(rootDir));

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

    // Extrai tabela de medidas
    let tabelaMedidas = [];
    $('table').each((_, tabela) => {
      const headers = [];
      $(tabela).find('tr').each((i, row) => {
        const cells = $(row).find('td, th');
        if (i === 0) {
          cells.each((_, cell) => headers.push($(cell).text().trim().toLowerCase()));
        } else {
          const values = {};
          cells.each((j, cell) => {
            const key = headers[j];
            if (key) values[key] = $(cell).text().trim();
          });
          if (values['busto'] && values['cintura']) tabelaMedidas.push(values);
        }
      });
    });

    // Extrai cores disponíveis
    const cores = $('.variant-item').map((_, el) => $(el).text().trim()).get();

    console.log("🛠️ Dados extraídos:", { nomeProduto, descricao, tabelaMedidas, cores });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Se vier mensagem de dúvida aberta
    if (message) {
      const promptGeral = `
Você é um vendedor especialista da Exclusive Dress.
Com base nas informações:
- Nome do produto: ${nomeProduto}
- Descrição: ${descricao}
- Tabela de medidas: ${JSON.stringify(tabelaMedidas)}
- Cores: ${cores.join(', ')}
Responda à dúvida: "${message}"
- Dúvidas sobre tamanho → informe que a cliente já inseriu as medidas.
- Sobre entrega → peça para inserir o CEP na página.
- Sobre troca/devolução → informe os links /trocas e /contato.
      `.trim();

      const atendimento = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Seja breve e direto, sem emojis.' },
          { role: 'user', content: promptGeral }
        ]
      });

      return res.json({
        resposta: atendimento.choices[0].message.content.trim()
      });
    }

    // Calcular tamanho ideal
    const promptTamanho = `
Você é um assistente de vendas de moda. Recomendarei um tamanho (36–58)
com base nas medidas da cliente e na tabela.
Dados:
- Busto: ${busto} cm
- Cintura: ${cintura} cm
- Quadril: ${quadril} cm
Tabela de medidas JSON: ${JSON.stringify(tabelaMedidas)}
`.trim();

    const sizeCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Responda apenas com o número do tamanho, sem texto extra.' },
        { role: 'user', content: promptTamanho }
      ]
    });

    const tamanhoIdeal = sizeCompletion.choices[0].message.content.trim();

    // Gerar cupom e mensagem complementar localmente
    const cupom = `TAM${tamanhoIdeal}`;
    const complemento = 
      `Você está prestes para arrasar com o ${nomeProduto} no tamanho ${tamanhoIdeal}! ` +
      `Para facilitar essa decisão, liberei um cupom especial para você:\n` +
      `Código do Cupom: ${cupom}`;

    // Retornar tamanho ideal e complemento
    return res.json({
      resposta: tamanhoIdeal,
      complemento,
      nomeProduto
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
