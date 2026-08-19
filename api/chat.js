// /api/chat.js — Vercel Serverless Function
// Copiloto IA: chama a API da Groq (nível gratuito) usando uma chave
// guardada em variável de ambiente (nunca aparece no código do site).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
    return;
  }

  try {
    const { messages, context } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Faltou o campo "messages" no corpo da requisição.' });
      return;
    }

    const dadosTexto = context
      ? '\n\nDADOS ATUAIS DO PAINEL (competência ' + (context.competencia || '?') + '), em JSON — use SOMENTE estes números ao responder sobre valores, e nunca invente outros:\n' +
        JSON.stringify(context, null, 2)
      : '\n\nNenhum dado carregado no painel no momento (RESUMO ainda não foi processado). Avise a pessoa disso caso ela pergunte por números.';

    // Converte {role:'user'|'ai', text} do chat para o formato OpenAI-compatible da Groq
    const chatMessages = [
      {
        role: 'system',
        content:
          'Você é o Copiloto IA do Painel SUS da Santa Casa de Montes Claros. Ajude com dúvidas sobre produção hospitalar, faturamento SUS, AIH, complexidade média/alta, diárias de UTI, FAEC/MAC e uso do painel.\n\n' +
          'REGRAS IMPORTANTES:\n' +
          '1. Os ÚNICOS módulos que existem no painel são: Metas AIH\'s, Valores por AIH\'s, Diárias de UTI, Contratos, Relatórios, Configurações, Atualizar Base, Copiloto IA (todos na barra lateral esquerda). NUNCA invente outros nomes de menu, submenu, botão ou caminho de navegação que não estejam nessa lista.\n' +
          '2. Para responder sobre números/valores (produção, metas, diferenças, UTI, financeiro), use exclusivamente o JSON em "DADOS ATUAIS DO PAINEL" abaixo. NUNCA invente números de exemplo, unidades fictícias (como "Pronto-Socorro") ou dados ilustrativos — se o dado pedido não estiver no JSON, diga claramente que não está disponível no momento.\n' +
          '3. Se a pessoa perguntar "onde vejo X", responda com o módulo real da lista acima que contém essa informação, sem inventar caminhos de cliques que não existem no sistema.\n' +
          '4. Escreva como uma pessoa conversando, em texto corrido e parágrafos curtos — nunca use tabelas, listas com marcadores, títulos com #, nem asteriscos para negrito. Traga os números dentro das frases, de forma natural (ex: "a Urgência ficou em 256 de 344 contratados, 88 abaixo do combinado" em vez de uma linha de tabela).\n' +
          '5. Seja direto e claro, e responda em português do Brasil.' +
          dadosTexto,
      },
      ...messages
        .filter((m) => m && m.text)
        .map((m) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: String(m.text),
        })),
    ];

    const model = 'openai/gpt-oss-120b';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: chatMessages,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      res.status(502).json({ error: `Erro da API Groq (HTTP ${resp.status}): ${t.slice(0, 300)}` });
      return;
    }

    const data = await resp.json();
    const text =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    res.status(200).json({ ok: true, text: text || '(resposta vazia)' });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
