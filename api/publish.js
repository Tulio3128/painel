// /api/publish.js — Vercel Serverless Function
// Publica o painel atualizado direto no repositório do GitHub, usando um
// token guardado em variável de ambiente (nunca fica visível no código).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'GITHUB_TOKEN não configurado nas variáveis de ambiente da Vercel.' });
    return;
  }

  const OWNER = 'Tulio3128';
  const REPO = 'painel';
  const PATH = 'index.html';
  const BRANCH = 'main';

  try {
    const { html } = req.body || {};
    if (!html || typeof html !== 'string') {
      res.status(400).json({ error: 'Faltou o campo "html" no corpo da requisição.' });
      return;
    }

    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    };

    const getResp = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers });
    if (!getResp.ok) {
      const t = await getResp.text();
      res.status(502).json({ error: `Falha ao ler arquivo atual no GitHub (HTTP ${getResp.status}). ${t.slice(0, 300)}` });
      return;
    }
    const cur = await getResp.json();

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Atualização automática do painel via módulo PDF — ${new Date().toISOString()}`,
        content: Buffer.from(html, 'utf-8').toString('base64'),
        sha: cur.sha,
        branch: BRANCH,
      }),
    });
    if (!putResp.ok) {
      const t = await putResp.text();
      res.status(502).json({ error: `Falha ao publicar no GitHub (HTTP ${putResp.status}). ${t.slice(0, 300)}` });
      return;
    }
    const result = await putResp.json();
    res.status(200).json({ ok: true, commit: result.commit && result.commit.html_url });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
