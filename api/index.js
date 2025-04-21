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

// Caminho absoluto para a pasta raiz do projeto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Servir o index.html do projeto na rota "/"
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/chat', async (req, res) => {
  try {
    const { busto, cintura, quadril, url, message } = req.body;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const textoPagina = $('body').text();

    if (message) {
      const prompt = `Você é um vendedor especialista. Com base na página do produto a seguir:\n${textoPagina}\n\nResponda de forma simpática e objetiva a dúvida: "${message}"`;

      const resposta = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Responda como um atendente simpático, sem emojis.' },
          { role: 'user', content: prompt }
        ]
      });

      return res.json({ resposta: resposta.choices[0].message.content });
    } else {
      const prompt = `Com base nas medidas busto ${busto}, cintura ${cintura}, quadril ${quadril}, e no conteúdo da página:\n${textoPagina}\n\nInforme apenas o número do tamanho ideal entre 36 e 58. Nada mais.`;

      const resposta = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Responda apenas com o número do tamanho entre 36 e 58.' },
          { role: 'user', content: prompt }
        ]
      });

      return res.json({ resposta: resposta.choices[0].message.content });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
