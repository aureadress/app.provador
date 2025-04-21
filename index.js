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

    // ✅ CAPTURA CORRETA PARA EXCLUSIVE DRESS
    const nomeProduto = $('.product-info-content h1').first().text().trim();

    // A descrição está dentro do #product-description
    const descricao = $('#product-description').text().trim();

    // Procurar tabela com "busto" e "cintura" no texto
    let tabelaMedidas = '';
    $('table').each((_, tabela) => {
      const textoTabela = $(tabela).text().toLowerCase();
      if (textoTabela.includes('busto') && textoTabela.includes('cintura')) {
        tabelaMedidas = $(tabela).text().trim();
      }
    });

    // Captura de cores (deixando preparado mesmo que nem sempre apareça)
    const cores = $('.variant-item').map((_, el) => $(el).text().trim()).get().join(', ');

    console.log("🛠️ Dados extraídos:\n", {
      nomeProduto,
      descricao,
      tabelaMedidas,
      cores
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (message) {
      const prompt = `Você é um vendedor especialista da loja Exclusive Dress.\n\nCom base nas informações abaixo:\n\n⭐ Nome do produto: ${nomeProduto}\n📜 Descrição: ${descricao}\n📏 Tabela de medidas:\n${tabelaMedidas}\n🎨 Cores disponíveis: ${cores}\n\nResponda à seguinte pergunta da cliente:\n"${message}"\n\nSe for dúvida sobre tamanho, informe que ela já inseriu as medidas.\nSe for dúvida sobre entrega, oriente a inserir o CEP na página do produto.\nSe for dúvida sobre troca, devolução ou contato, envie os links: /trocas /contato.`;

      const resposta = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Responda como um atendente simpático da loja Exclusive Dress. Seja direto, sem emojis.' },
          { role: 'user', content: prompt }
        ]
      });

      return res.json({ resposta: resposta.choices[0].message.content });
    }

    const prompt = `Com base nas medidas da cliente:\n- Busto: ${busto} cm\n- Cintura: ${cintura} cm\n- Quadril: ${quadril} cm\n\nE nas informações da página do produto abaixo:\n\n⭐ Nome do produto: ${nomeProduto}\n📜 Descrição: ${descricao}\n📏 Tabela de medidas:\n${tabelaMedidas}\n🎨 Cores disponíveis: ${cores}\n\nResponda apenas com o número do tamanho ideal entre 36 e 58. Sem nenhum outro texto.`;

    const resposta = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Responda apenas com o número entre 36 e 58. Nenhuma explicação ou emoji.' },
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
