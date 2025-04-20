import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { OpenAI } from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/ia", async (req, res) => {
  const { busto, cintura, quadril, url, message } = req.body;

  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const html = await page.content();
    const $ = cheerio.load(html);
    const nome = $("h1").first().text().trim();
    const descricao = $("#product-description").text().trim();
    const caracteristicas = $(".product-features").text().trim();
    await browser.close();

    const prompt = message
      ? `🧠 INSTRUÇÕES PARA A I.A - ASSISTENTE VIRTUAL EXCLUSIVE DRESS\n\nVocê é um especialista em moda da loja Exclusive Dress. Responda a pergunta com base nas medidas e no conteúdo da página abaixo.\n\nMedidas: Busto ${busto}, Cintura ${cintura}, Quadril ${quadril}\nPergunta do cliente: ${message}\n\nProduto:\nNome: ${nome}\nDescrição: ${descricao}\nCaracterísticas: ${caracteristicas}`
      : `Você é um especialista em moda da loja Exclusive Dress. Com base nas medidas abaixo e nas informações da página do produto, responda apenas com o número do tamanho ideal (entre 36 e 58), sem explicações.\n\nBusto: ${busto} cm\nCintura: ${cintura} cm\nQuadril: ${quadril} cm\n\nProduto:\nNome: ${nome}\nDescrição: ${descricao}\nCaracterísticas: ${caracteristicas}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const resposta = completion.choices[0]?.message?.content?.trim();
    res.json({ resposta });
  } catch (err) {
    console.error("Erro no processamento:", err);
    res.status(500).json({ erro: "Erro ao processar a requisição." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
