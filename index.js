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

    // Tabela de medidas como array de objetos
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

    // Cores como array de strings
    let cores = $('.variant-item').map((_, el) => $(el).text().trim()).get();

    console.log("🛠️ Dados extraídos:\n", {
      nomeProduto,
      descricao,
      tabelaMedidas,
      cores
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (message) {
      // Lógica de resposta a dúvidas gerais
      const promptGeral = `Você é um vendedor especialista da loja Exclusive Dress.

Com base nas informações abaixo:

⭐ Nome do produto: ${nomeProduto}
📜 Descrição: ${descricao}
📏 Tabela de medidas (como array):
${JSON.stringify(tabelaMedidas, null, 2)}
🎨 Cores disponíveis: ${cores.join(', ')}

Responda à seguinte pergunta da cliente:
"${message}"

Se for dúvida sobre tamanho, informe que ela já inseriu as medidas.
Se for dúvida sobre entrega, oriente a inserir o CEP na página do produto.
Se for dúvida sobre troca, devolução ou contato, envie os links: /trocas /contato.`;

      const resposta = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Responda como um atendente simpático da loja Exclusive Dress. Seja direto, sem emojis.' },
          { role: 'user', content: promptGeral }
        ]
      });

      return res.json({ resposta: resposta.choices[0].message.content });
    }

    // Lógica de recomendação de tamanho com fórmula avançada
    const prompt = `
Você é um assistente de vendas especialista em vestuário. Para recomendar o tamanho ideal:

0. Identifique o “modelo” do vestido no texto da descrição (case-insensitive):
   • Se encontrar “EVASE”, “EVASÊ”, “Evasê”, “Evase” ou “evase”: MODELO = EVASÊ.
   • Senão, se encontrar “SEREIA”, “sereia” ou qualquer variação: MODELO = SEREIA.
   • Senão:
     – Se a tabela de medidas tiver somente Busto e Cintura: MODELO = EVASÊ.
     – Se a tabela tiver Busto, Cintura e Quadril: MODELO = SEREIA.

1. Conversão de intervalos (para cada tamanho da tabela):
   • Se o valor vier como “min-max” ou “min/max”, use {min, max}.
   • Se vier apenas “X”:
     – Se não for o último tamanho, defina max = próximo min da tabela.
     – Se for o último, defina max = X + 6 cm.

2. Distância da medida ao intervalo:
   • Se a medida da cliente estiver dentro do intervalo: distância = 0.
   • Caso contrário: distância = diferença até o limite mais próximo.

3. Cálculo de pontuação:
   • Se MODELO = EVASÊ ou não houver coluna de Quadril:
     pontuação = 0.85 × distância_busto + 0.15 × distância_cintura.
   • Se MODELO = SEREIA:
     pontuação = 0.60 × distância_busto + 0.10 × distância_cintura + 0.40 × distância_quadril.

4. Seleção do tamanho:
   • Escolha o tamanho com menor pontuação.
   • Se MODELO = SEREIA, após escolher, subtraia 1 desse valor (se não houver tamanho menor, mantenha o valor original).

5. **Responda APENAS** com o número do tamanho ideal (entre 36 e 58).

Dados da cliente:
- Busto: ${busto} cm
- Cintura: ${cintura} cm
- Quadril: ${quadril} cm

Informações do produto:
⭐ Nome do produto: ${nomeProduto}
📜 Descrição: ${descricao}
📏 Tabela de medidas (como array):
${JSON.stringify(tabelaMedidas, null, 2)}
🎨 Cores disponíveis: ${cores.join(', ')}`;

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
