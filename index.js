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

    // Extração de nome, descrição e tabela de medidas (método Bagy original)
    const nomeProduto = $('.product-info-content h1').first().text().trim();
    const descricao   = $('#product-description').text().trim();

    // Monta tabela de medidas como array de objetos
    let tabelaMedidas = [];
    $('table').each((_, tabela) => {
      const headers = [];
      $(tabela).find('tr').each((i, row) => {
        const cells = $(row).find('td, th');
        if (i === 0) {
          cells.each((_, cell) => {
            headers.push($(cell).text().trim().toLowerCase());
          });
        } else {
          const values = {};
          cells.each((j, cell) => {
            const key = headers[j];
            if (key) values[key] = $(cell).text().trim();
          });
          if (values['busto'] && values['cintura']) {
            tabelaMedidas.push(values);
          }
        }
      });
    });

    // Extrai cores disponíveis
    let cores = $('.variant-item').map((_, el) => $(el).text().trim()).get();

    console.log("🛠️ Dados extraídos:\n", {
      nomeProduto,
      descricao,
      tabelaMedidas,
      cores
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Ramo para perguntas gerais (chat)
    if (message) {
      const prompt = `Você é um vendedor especialista da loja Exclusive Dress.\n\n` +
        `Com base nas informações abaixo:\n\n` +
        `⭐ Nome do produto: ${nomeProduto}\n` +
        `📜 Descrição: ${descricao}\n` +
        `📏 Tabela de medidas (como array):\n${JSON.stringify(tabelaMedidas, null, 2)}\n` +
        `🎨 Cores disponíveis: ${cores.join(', ')}\n\n` +
        `Responda à seguinte pergunta da cliente:\n"${message}"\n\n` +
        `Se for dúvida sobre tamanho, informe que ela já inseriu as medidas.\n` +
        `Se for dúvida sobre entrega, oriente a inserir o CEP na página do produto.\n` +
        `Se for dúvida sobre troca, devolução ou contato, envie os links: /trocas /contato.`;

      const resposta = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Responda como um atendente simpático da loja Exclusive Dress. Seja direto, sem emojis.' },
          { role: 'user',   content: prompt }
        ]
      });

      return res.json({ resposta: resposta.choices[0].message.content });
    }

    // --- RECOMENDAÇÃO DE TAMANHO ------------------------------------------------
    // 1) Detecta o tipo de modelo na descrição (ou usa 'evase' por padrão)
    let modelo = 'evase';
    if (/sereia/i.test(descricao)) modelo = 'sereia';
    else if (/evase/i.test(descricao)) modelo = 'evase';

    // 2) System prompt completo com regra de recomendação
    const systemPrompt = `
Você é um assistente especialista em moda, focado em recomendar somente o número do tamanho ideal (36–58) para vestidos de festa, seguindo esta REGRA:

1. Extração dinâmica
   - Da descrição/Características do produto, identifique os intervalos de Busto, Cintura e, quando houver, Quadril.
   - Identifique o tipo de modelo: evase ou sereia. Se não encontrado, considere evase.

2. Interpretação de intervalos
   - Valores podem vir como “90-94”, “80/83” ou “80”.
   - Converta cada string em { min: N, max: M } (para valor único, min = max = N).

3. Cálculo de diferença
   function diffIntervalo(valor, {min, max}) {
     if (valor >= min && valor <= max) return 0;
     return valor < min ? min - valor : valor - max;
   }

4. Parâmetros por modelo (com base em "${modelo}")
   - evase (A-line, mais folgado):
     pesos = { busto: 0.85, cintura: 0.15, quadril: 0 }
     offset = 0
   - sereia (colado ao corpo, mais justo):
     pesos = { busto: 0.70, cintura: 0.10, quadril: 0.20 }
     offset = -1

5. Score ponderado
   Para cada tamanho disponível (36–58), calcule:
     score = diffBusto*pesoBusto + diffCintura*pesoCintura + diffQuadril*pesoQuadril

6. Seleção e ajuste final
   - Escolha o tamanho com menor score.
   - Em caso de empate, escolha o menor tamanho.
   - Aplique: tamanhoFinal = Math.min(58, Math.max(36, escolhido + offset))

7. Saída
   - Responda apenas com o número do tamanho final (por exemplo: 38).
   - Não envie nada além deste número na resposta.
`;

    // 3) Prompt do usuário com medidas
    const promptRec = `Com base nas medidas da cliente:\n- Busto: ${busto} cm\n- Cintura: ${cintura} cm\n- Quadril: ${quadril} cm`;

    // 4) Chamada à API com nossa regra completa
    const resposta = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: promptRec   }
      ]
    });

    return res.json({ resposta: resposta.choices[0].message.content });
    // -----------------------------------------------------------------------------  

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
