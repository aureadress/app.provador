import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { OpenAI } from 'openai';

config();
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/ia', async (req, res) => {
  try {
    const { busto, cintura, quadril, url, message } = req.body;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const nome = $('h1').text().trim();
    const descricao = $('#product-description').text().trim();
    const caracteristicas = $('.product-features').text().trim();

    const contextoHTML = `
Nome do Produto: ${nome}
Descrição: ${descricao}
Características: ${caracteristicas}
HTML bruto da página: ${html}
`.replace(/\s+/g, ' ').trim();

    let prompt = '';

    if (!message && busto && cintura && quadril) {
      // Prompt 1: retorna apenas o número (36 a 58)
      prompt = `
Você é um especialista em moda da loja Exclusive Dress. Com base nas medidas a seguir e nas informações da página, responda apenas com o número do tamanho ideal (36 a 58), sem explicações:

Busto: ${busto} cm
Cintura: ${cintura} cm
Quadril: ${quadril} cm

Produto:
${contextoHTML}
      `.trim();
    } else {
      // Prompt 2: mensagem complementar com saudação, nome em negrito e ajuda
      prompt = `
🧠 INSTRUÇÕES PARA A I.A - ASSISTENTE VIRTUAL EXCLUSIVE DRESS

Você é um especialista em moda da loja Exclusive Dress. Seu papel é ajudar o cliente com base nas medidas e na página do produto.

💬 Pergunta ou contexto do cliente:
${message || `Minhas medidas são busto ${busto}, cintura ${cintura}, quadril ${quadril}. Qual o tamanho ideal?`}

📄 Produto:
${contextoHTML}
      `.trim();
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
    });

    res.json(completion);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao processar requisição.');
  }
});

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
