
import express from 'express';
import cors from 'cors';
import axios from 'axios';
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

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.post('/chat', async (req, res) => {
  try {
    const { busto, cintura, quadril, url, message, nomeLoja } = req.body;

    // Corrigir extração de slug (pegar penúltimo item da URL)
    const partes = url.split('/').filter(Boolean);
    const slug = partes[partes.length - 2];

    // Buscar produto pela API da Bagy
    const apiResponse = await axios.get(`https://api.dooca.store/products?slug=${slug}`, {
      headers: {
        Authorization: `Bearer ${process.env.BAGY_API_KEY}`
      }
    });
    const produto = apiResponse.data[0];

    if (!produto) {
      return res.json({
        resposta: '',
        complemento: 'Produto não encontrado via API Bagy.'
      });
    }

    const nomeProduto = produto.name || '';
    const descricao = produto.description?.replace(/<[^>]+>/g, '') || '';
    const cores = produto.variations?.map(v => v.color?.name).filter(Boolean) || [];

    // Montar tabela de medidas
    const tabelaMedidas = [];
    const tabelaFonte = produto.features?.find(f => f.name.toLowerCase().includes('medida') || f.name.toLowerCase().includes('tamanho'));

    if (tabelaFonte?.values?.length) {
      tabelaFonte.values.forEach(v => {
        tabelaMedidas.push({ medida: v.name });
      });
    }

    if (!tabelaMedidas.length) {
      return res.json({
        resposta: '',
        complemento: 'Não foi possível encontrar a tabela de medidas via API.'
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (message) {
      const promptGeral = `
Você é um vendedor especialista da loja ${nomeLoja || 'Sua Loja'}.
Produto: ${nomeProduto}
Descrição: ${descricao}
Cores: ${cores.join(', ')}
Tabela de medidas: ${JSON.stringify(tabelaMedidas)}

Dúvida: "${message}"

REGRAS:
- Sempre responda dúvidas de forma breve e clara.
- Nunca diga que não sabe, utilize os dados acima.
      `;

      const atendimento = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Seja breve, objetivo, SEM emojis. Sempre informe o que for perguntado usando os dados acima.' },
          { role: 'user', content: promptGeral }
        ]
      });

      return res.json({
        resposta: atendimento.choices[0].message.content.trim(),
        complemento: ''
      });
    }

    const promptTamanho = `
Você é assistente de vendas de moda. Com base nestas medidas da cliente:
- Busto: ${busto} cm
- Cintura: ${cintura} cm
- Quadril: ${quadril} cm
E na tabela de medidas JSON: ${JSON.stringify(tabelaMedidas)}
Indique apenas o número do tamanho ideal (36–58).
`;

    const sizeCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Responda apenas com o número do tamanho, sem texto extra.' },
        { role: 'user', content: promptTamanho }
      ]
    });

    const tamanhoIdeal = sizeCompletion.choices[0].message.content.trim();
    const cupom = `TAM${tamanhoIdeal}`;
    const complemento = `Você está prestes para arrasar com o <strong>${nomeProduto}</strong> no tamanho <strong>${tamanhoIdeal}</strong>. Para facilitar, liberei um cupom especial:<br><strong>Código do Cupom: ${cupom}</strong> Use na finalização da compra e aproveite o desconto. Corre que é por tempo limitado!`;

    return res.json({
      resposta: tamanhoIdeal,
      complemento
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao processar a requisição' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
