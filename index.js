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

    // Extrair nome da loja
    const comments = [];
    $('body').contents().each((_, node) => {
      if (node.type === 'comment') comments.push(node.data.trim());
    });
    const provadorComment = comments.find(c => c.startsWith('PROVADOR INTELIGENTE -'));
    const nomeEmpresa = provadorComment ? provadorComment.split('-')[1].trim() : 'Exclusive Dress';

    // Nome do produto
    const nomeProduto = $('.product-info-content h1').first().text().trim();

    // Descrição
    const descricao = $('meta[name="description"]').attr('content')?.trim() || '';

    // Tabela de medidas como array de objetos
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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (message) {
      // Prompt para dúvidas gerais da cliente
      const systemMsg = `Responda como um(a) atendente especialista da loja ${nomeEmpresa}, de forma direta e sem emojis.`;
      const userMsg = `Você é um(a) vendedor(a) especialista da loja ${nomeEmpresa}.

Com base nas informações abaixo:
- Nome do produto: ${nomeProduto}
- Descrição: ${descricao}
- Cores disponíveis: ${cores.join(', ')}

Responda à seguinte pergunta da cliente:
"${message}"

- Se for dúvida sobre tamanho, solicite que ela insira as medidas de busto, cintura e quadril.
- Se for dúvida sobre entrega, oriente-a a inserir o CEP na página do produto.
- Se for dúvida sobre troca, devolução ou contato, forneça os links: /trocas e /contato.`;

      const resposta = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg }
        ]
      });

      return res.json({ resposta: resposta.choices[0].message.content });
    }

    // Prompt para recomendação de tamanho
    const systemMsg = 'Responda apenas com o número do tamanho ideal entre 36 e 58. Nenhum outro texto.';
    const userMsg = `Com base nas medidas da cliente:
- Busto: ${busto} cm
- Cintura: ${cintura} cm
- Quadril: ${quadril} cm

E nas informações do produto:
⭐ Nome: ${nomeProduto}
📜 Descrição: ${descricao}
📏 Tabela de medidas (array):
${JSON.stringify(tabelaMedidas, null, 2)}
🎨 Cores: ${cores.join(', ')}

Siga estas etapas:
1. Identifique em cada tamanho os intervalos de busto, cintura e quadril.
2. Determine o modelo: evase (folgado) ou sereia (justo). Se não especificado, use evase.
3. Aplique pesos:
   - Evase: busto 0,85; cintura 0,15; quadril 0.
   - Sereia: busto 0,70; cintura 0,10; quadril 0,20.
4. Converta intervalos como "90-94" ou "80/83" em {min: N, max: M} (para valor único, min = max).
5. Calcule diferença: se dentro do intervalo, zero; se fora, distância até o intervalo.
6. Multiplique cada diferença pelo peso e some (score).
7. Escolha o tamanho com menor score; em empate, o menor.
8. Se modelo for sereia, subtraia 1 do tamanho escolhido; se evase, sem offset.
9. Responda apenas com o número final entre 36 e 58.`;

    const resposta = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg }
      ]
    });

    return res.json({ resposta: resposta.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
