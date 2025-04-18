import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

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

    const nomeProduto = $('h1').text().trim();
    const descricaoProduto = $('#product-description').text().trim();
    const caracteristicas = $('.product-features').text().trim();

    const contextoHTML = `
Nome do Produto: ${nomeProduto}
Descrição: ${descricaoProduto}
Características: ${caracteristicas}
HTML bruto da página: ${html}
    `.replace(/\s+/g, ' ').trim();

    let prompt = '';

    if (!message && busto && cintura && quadril) {
      // Recomendação de número puro do tamanho
      prompt = `
Você é um especialista em moda da loja Exclusive Dress. Seu papel é analisar o conteúdo da página do produto abaixo (HTML, nome, descrição, características) e as medidas fornecidas.

Tarefa: Responda APENAS com o número do tamanho ideal (entre 36 e 58). Não adicione explicações ou texto extra. Apenas o número.

📏 Medidas da cliente:
- Busto: ${busto} cm
- Cintura: ${cintura} cm
- Quadril: ${quadril} cm

📄 Informações do produto:
${contextoHTML}
      `.trim();
    } else {
      // Resposta complementar ou perguntas livres
      prompt = `
🧠 INSTRUÇÕES PARA A I.A - ASSISTENTE VIRTUAL EXCLUSIVE DRESS

Você é um especialista em moda da loja Exclusive Dress. Seu papel é ajudar o cliente a encontrar o tamanho ideal de vestido com base nas medidas fornecidas (busto, cintura, quadril) e nas informações da página atual do produto.

🎯 ORIENTAÇÕES GERAIS
- Sempre responda com simpatia, clareza e objetividade.
- Use linguagem amigável e direta.
- Evite respostas longas ou incrementadas — seja breve e eficiente.

📄 Informações do produto atual:
${contextoHTML}

💬 Dúvida ou mensagem do cliente:
${message || `Minhas medidas são busto ${busto}, cintura ${cintura}, quadril ${quadril}. Qual o tamanho ideal?`}
      `.trim();
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    res.json(completion);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao processar requisição.');
  }
});

// Servir frontend (index.html e widget)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'widget.js'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
