
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 🔧 Corrige __dirname para ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 🔥 Serve index.html da raiz do projeto
app.use(express.static(path.join(__dirname, '..')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/chat', async (req, res) => {
  try {
    const { busto, cintura, quadril, url, message } = req.body;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const textoPagina = $('body').text();

    let prompt = '', system = '', modelo = 'gpt-4';

    if (message) {
      system = 'Responda como um atendente simpático, sem emojis.';
      prompt = `Você é um vendedor especialista. Com base na página do produto a seguir:
${textoPagina}

Responda a dúvida: "${message}"`;
    } else {
      system = 'Responda apenas com o número do tamanho entre 36 e 58.';
      prompt = `Com base nas medidas busto ${busto}, cintura ${cintura}, quadril ${quadril}, e no conteúdo da página:
${textoPagina}

Informe apenas o número do tamanho ideal entre 36 e 58. Nada mais.`;
    }

    const resposta = await openai.chat.completions.create({
      model: modelo,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    });

    res.json({ resposta: resposta.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
