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

    // 🔍 Extrações inteligentes
    const nomeProduto = $('h1').first().text().trim();
    const descricao = $('.product-description').text().trim();

    let tabelaMedidas = '';
    $('table').each((i, tabela) => {
      const textoTabela = $(tabela).text().toLowerCase();
      if (textoTabela.includes('busto') && textoTabela.includes('cintura')) {
        tabelaMedidas = $(tabela).text().trim();
      }
    });

    const cores = $('.product-variants .variant-color').text().trim();

    console.log("🛠️ Dados extraídos:\n", {
      nomeProduto,
      descricao,
      tabelaMedidas,
      cores
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (message) {
      const prompt = `Você é um vendedor especialista em moda festa.\n\n🛍️ Produto: ${nomeProduto}\n\n📝 Descrição:\n${descricao}\n\n📏 Tabela de Medidas:\n${tabelaMedidas}\n\n🎨 Cores disponíveis:\n${cores}\n\nA cliente perguntou:\n\"${message}\"\n\nResponda de forma simpática, objetiva e com base nessas informações.`;

      const resposta = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Responda como um atendente simpático, sem emojis.' },
          { role: 'user', content: prompt }
        ]
      });
      return res.json({ resposta: resposta.choices[0].message.content });
    }

    const prompt = `Você é um vendedor especialista em vestidos de festa.\n\nCom base nas informações do produto abaixo:\n\n🛍️ Nome: ${nomeProduto}\n\n📝 Descrição:\n${descricao}\n\n📏 Tabela de Medidas:\n${tabelaMedidas}\n\n🎨 Cores disponíveis:\n${cores}\n\nCom base nas medidas da cliente:\n- Busto: ${busto} cm\n- Cintura: ${cintura} cm\n- Quadril: ${quadril} cm\n\nResponda apenas com o número do tamanho ideal entre 36 e 58. Nenhum texto adicional.`;

    const resposta = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Responda apenas com o número do tamanho entre 36 e 58.' },
        { role: 'user', content: prompt }
      ]
    });

    return res.json({ resposta: resposta.choices[0].message.content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
