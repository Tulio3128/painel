// /api/chat.js — Vercel Serverless Function
// Copiloto IA: chama a API do Google Gemini (nível gratuito) usando uma chave
// guardada em variável de ambiente (nunca aparece no código do site).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
    return;
  }

  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Faltou o campo "messages" no corpo da requisição.' });
      return;
    }

    // Converte {role:'user'|'ai', text} do chat para o formato da API do Gemini
    const contents = messages
      .filter((m) => m && m.text)
      .map((m) => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: String(m.text) }],
      }));

    const model = 'gemini-flash-latest';
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      model +
      ':generateContent?key=' +
      apiKey;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [
            {
              text:
                'Você é o Copiloto IA do Painel SUS da Santa Casa de Montes Claros. Ajude com dúvidas sobre produção hospitalar, faturamento SUS, AIH, complexidade média/alta, diárias de UTI, FAEC/MAC e uso do painel. Seja direto, claro e responda em português do Brasil.',
            },
          ],
        },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      res.status(502).json({ error: `Erro da API Gemini (HTTP ${resp.status}): ${t.slice(0, 300)}` });
      return;
    }

    const data = await resp.json();
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const text = parts.map((p) => p.text || '').join('');
    res.status(200).json({ ok: true, text: text || '(resposta vazia)' });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
