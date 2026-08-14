// /api/chat.js — Vercel Serverless Function
// Copiloto IA: chama a API da Anthropic (Claude) usando uma chave guardada
// em variável de ambiente (nunca aparece no código do site).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
    return;
  }

  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Faltou o campo "messages" no corpo da requisição.' });
      return;
    }

    // Converte {role:'user'|'ai', text} do chat para o formato da API da Anthropic
    const apiMessages = messages
      .filter((m) => m && m.text)
      .map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: String(m.text),
      }));

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system:
          'Você é o Copiloto IA do Painel SUS da Santa Casa de Montes Claros. Ajude com dúvidas sobre produção hospitalar, faturamento SUS, AIH, complexidade média/alta, diárias de UTI, FAEC/MAC e uso do painel. Seja direto, claro e responda em português do Brasil.',
        messages: apiMessages,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      res.status(502).json({ error: `Erro da API Anthropic (HTTP ${resp.status}): ${t.slice(0, 300)}` });
      return;
    }

    const data = await resp.json();
    const text = (data.content || []).map((b) => b.text || '').join('');
    res.status(200).json({ ok: true, text: text || '(resposta vazia)' });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
