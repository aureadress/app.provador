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
    const prompt = message
      ? `Com base nas informações do produto "${nome}" (${descricao}) e na pergunta: "${message}", responda como um vendedor especialista.`
      : `Minhas medidas são: busto ${busto} cm, cintura ${cintura} cm, quadril ${quadril} cm. Com base no produto "${nome}" (${descricao}), qual o número ideal entre 36 e 58?`;

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

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
