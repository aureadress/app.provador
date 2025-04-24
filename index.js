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

    const nomeProduto = $('.product-info-content h1').first().text().trim();
    const descricao = $('#product-description').text().trim();

    // Extração da tabela de medidas
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

    // Cores disponíveis
    const cores = $('.variant-item').map((_, el) => $(el).text().trim()).get();

    console.log("🛠️ Dados extraídos:\n", { nomeProduto, descricao, tabelaMedidas, cores });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (message) {
      // Atendimento geral breve
      const promptGeral = `Você é um vendedor especialista da loja Exclusive Dress.\n\n` +
        `Com base nas informações abaixo:\n` +
        `⭐ Nome do produto: ${nomeProduto}\n` +
        `📜 Descrição: ${descricao}\n` +
        `📏 Tabela de medidas: ${JSON.stringify(tabelaMedidas, null, 2)}\n` +
        `🎨 Cores: ${cores.join(', ')}\n\n` +
        `Responda à seguinte pergunta da cliente:\n"${message}"\n\n` +
        `- Se for dúvida sobre tamanho, informe que ela já inseriu as medidas.\n` +
        `- Se for dúvida sobre entrega, oriente a inserir o CEP na página do produto.\n` +
        `- Se for dúvida sobre troca, devolução ou contato, envie os links: /trocas /contato.`;

      const resposta = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Responda de forma breve e direta, sem emojis.' },
          { role: 'user', content: promptGeral }
        ]
      });

      return res.json({ resposta: resposta.choices[0].message.content.trim() });
    }

    // Cálculo do tamanho ideal
    const promptTamanho = `Você é um assistente de vendas especialista em vestuário. Para recomendar o tamanho ideal:\n\n` +
      `0. Identifique o modelo do vestido (case-insensitive):\n` +
      `   • “EVASE/Evasê/Evasê/evase”: MODELO = EVASÊ.\n` +
      `   • “SEREIA/sereia”: MODELO = SEREIA.\n` +
      `   • Senão: se só Busto e Cintura → EVASÊ; se Busto, Cintura e Quadril → SEREIA.\n\n` +
      `1. Se MODELO = EVASÊ, ignore quadril.\n` +
      `2. Conversão de intervalos: “min-max” ou “min/max” → {min,max}; “X” → max = próximo min ou X+6 se último.\n` +
      `3. Distância: 0 se dentro; diferença até limite mais próximo se fora.\n` +
      `4. Pontuação: EVASÊ → 0.85×dist_busto + 0.15×dist_cintura; SEREIA → 0.60×dist_busto + 0.10×dist_cintura + 0.40×dist_quadril.\n` +
      `5. Escolha menor pontuação; se SEREIA, subtraia 1 (se existir menor).\n` +
      `Responda apenas com o número do tamanho ideal (36–58).\n` +
      `Dados: Busto ${busto} cm, Cintura ${cintura} cm, Quadril ${quadril} cm.\n` +
      `Tabela: ${JSON.stringify(tabelaMedidas, null, 2)}; Cores: ${cores.join(', ')}.`;

    const sizeCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Responda apenas com o número entre 36 e 58, sem texto adicional.' },
        { role: 'user', content: promptTamanho }
      ]
    });
    const tamanhoIdeal = sizeCompletion.choices[0].message.content.trim();

    // Mensagem complementar breve e persuasiva
    const promptComplemento = `Você é um vendedor persuasivo da Exclusive Dress.\n` +
      `Baseado em:\n` +
      `- Produto: ${nomeProduto}\n` +
      `- Tamanho ideal: ${tamanhoIdeal}\n\n` +
      `Crie uma mensagem em até duas frases curtas:` +
      `"Para o ${nomeProduto} o tamanho ideal é o ${tamanhoIdeal}. Você está fazendo uma ótima escolha, pois é um vestido elegante, ${descricao.split('.')[0].toLowerCase()}. Gostaria de finalizar a compra?"`;

    const complementoCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Seja objetivo, muito breve e sem emojis.' },
        { role: 'user', content: promptComplemento }
      ]
    });
    const mensagemComplementar = complementoCompletion.choices[0].message.content.trim();

    // Retorno com tamanho e complemento
    return res.json({ resposta: tamanhoIdeal, complemento: mensagemComplementar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
