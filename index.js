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

    // 1. Extrair nome da loja do comentário HTML
    const comentarios = [];
    $('body').contents().each((_, node) => {
      if (node.type === 'comment') comentarios.push(node.data.trim());
    });
    const linha = comentarios.find(c => c.startsWith('PROVADOR INTELIGENTE -'));
    const nomeEmpresa = linha ? linha.split('-')[1].trim() : 'Exclusive Dress';

    // 2. Extrair nome do produto
    const nomeProduto = $('.product-info-content h1').first().text().trim();

    // 3. Extrair descrição do meta description
    const descricao = $('meta[name="description"]').attr('content')?.trim() || '';

    // 4. Extrair cores disponíveis
    const cores = $('.product-color a')
      .map((_, el) => $(el).attr('title').trim())
      .get();

    // 5. Extrair tamanhos disponíveis
    let tamanhosDisponiveis = [];
    $('.product-attribute.mb-5').each((_, section) => {
      const titulo = $(section).find('h2').first().text().trim().toUpperCase();
      if (titulo === 'TAMANHO') {
        tamanhosDisponiveis = $(section)
          .find('.product-attribute-button .text')
          .map((_, el) => $(el).text().trim())
          .get();
      }
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (message) {
      // Prompt para dúvidas gerais da cliente
      const systemMsg = `Responda como um(a) atendente especialista da loja ${nomeEmpresa}, de forma direta e sem emojis.`;
      const userMsg = `Você é um(a) vendedor(a) especialista da loja ${nomeEmpresa}.
Com base nas informações abaixo sobre o produto:
- Nome: ${nomeProduto}
- Descrição: ${descricao}
- Cores disponíveis: ${cores.join(', ')}
- Tamanhos disponíveis: ${tamanhosDisponiveis.join(', ')}

Responda à seguinte pergunta da cliente:
"${message}"

- Se for dúvida sobre tamanho, peça que ela insira as medidas de busto, cintura e quadril para que você indique o tamanho ideal.
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
- Nome: ${nomeProduto}
- Descrição: ${descricao}
- Tabela de medidas: ${JSON.stringify(tabelaMedidas, null, 2)}
- Cores disponíveis: ${cores.join(', ')}

Siga estas regras para escolher o tamanho:
1. Identifique em cada tamanho os intervalos de busto, cintura e quadril.
2. Determine o tipo de modelo: evase (mais folgado) ou sereia (mais justo). Se não estiver especificado, use evase.
3. Atribua pesos para cada modelo:
   - Evase: busto 0,85; cintura 0,15; quadril 0.
   - Sereia: busto 0,70; cintura 0,10; quadril 0,20.
4. Converta intervalos escritos como “90-94” ou “80/83” em { min: N, max: M }. Para valor único, min = max.
5. Calcule a diferença entre a medida da cliente e cada intervalo, multiplique pelo peso respectivo.
6. Some os resultados (score) e escolha o tamanho com menor score. Em caso de empate, prefira o menor tamanho.
7. Aplique offset: se modelo for sereia, subtraia 1 do tamanho escolhido; se for evase, não aplique offset.
8. Responda apenas com o número final entre 36 e 58.`;

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
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
