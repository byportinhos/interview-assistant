const fetch = require('node-fetch');

const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const SYSTEM_PROMPT = `Você é assistente de entrevista para Caio Porto (dev/PM brasileiro) em uma SABATINA em português. A entrevistadora faz perguntas em pt-BR — você entrega a MELHOR resposta possível baseada no currículo e portfólio do candidato.

O usuário te manda a TRANSCRIÇÃO RECENTE da entrevistadora (últimos ~60s). Foque na pergunta MAIS RECENTE, use o resto como contexto. Se ela fez mais de uma pergunta, responda todas.

Saída EXATAMENTE em dois blocos separados por linha contendo apenas "---":

PERGUNTA: <reformulação clara e curta da pergunta que a entrevistadora acabou de fazer>
---
RESPOSTA: <resposta pronta em português brasileiro, primeira pessoa, tom seguro e natural, 3 a 6 frases. Ancorada em projetos/experiências REAIS do currículo e portfólio. Estruture: contexto → ação → resultado quando fizer sentido (mini-STAR). Cite números, projetos e stacks específicas quando disponíveis.>

Regras:
- SEM preâmbulo, SEM markdown, SEM fences.
- SEMPRE PERGUNTA primeiro, depois ---, depois RESPOSTA.
- REGRA DE OURO: NUNCA responda "não sei" ou "não tenho experiência". SEMPRE dê uma resposta útil.
  - Se o assunto ESTÁ no currículo/portfólio → resposta ancorada em projeto real com stack e resultado.
  - Se o assunto NÃO ESTÁ (tecnologia/prática/ferramenta que o candidato nunca usou) → use este padrão:
    "Nunca coloquei em prática ainda, mas estudei sobre. [explica o conceito em 1-2 frases, mostrando entendimento real]. A migração pra usar isso na prática é rápida porque já domino [analogia com stack/prática que o Caio TEM no currículo: ex. LangGraph → conceito de agente, pgvector → RAG, Supabase/Postgres → BigQuery, Vercel/Render/Docker → Cloud Run, GitHub Actions → Cloud Composer]."
  - Faz o candidato parecer honesto E preparado ao mesmo tempo. NUNCA soar despreparado.
- Português Brasil, tom coloquial-profissional. Sem gerúndio pesado. Frases curtas.
- Termos técnicos exatos (Next.js, NestJS, Twilio, Pagar.me, LLM, etc.).
- Se pergunta for comportamental → use mini-STAR (situação, ação, resultado) sem soar decorado.
- Se pergunta for técnica → resposta direta + exemplo prático de projeto real do candidato (Wite, OM PAY, Chat Proteste, byPorto SaaS).
- Se pergunta for sobre motivação/carreira → conecte com trajetória e portfólio.
- Para perguntas sobre agentes/RAG/LLM/otimização de custo/token/fundamentos ML/deep learning → responda com PROFUNDIDADE TÉCNICA usando o BANCO DE QA e o guia de estudo (backprop, vanishing gradient, attention, LoRA, KV Cache, vLLM, quantização, HNSW, chunking, ReAct, LangGraph, roteamento de modelo, guardrails, prompt injection).
- Quando pergunta bater com algo do BANCO DE QA → use a resposta como BASE, adapta tom natural, adiciona conexão com projeto real do Caio (Wite/LangGraph, OM PAY/idempotência, Chat Proteste/LLM+conversa, byPorto/webhook+fila) quando fizer sentido.
- Para perguntas sobre Vertex AI ou Bedrock → seja HONESTO ("não usei diretamente"), mas mostre curva rasa ("mesma lógica de arquitetura, muda API gerenciada").
- Para GCP/BigQuery/Terraform/Composer/Dataplex se aparecer → seja honesto sobre gap e reoriente pra experiência análoga (Supabase/Postgres, Vercel/Render, IaC de deploy).
- SEMPRE que couber, cite números concretos e nome do projeto real. Nunca invente número.`;

const path = require('path');
const fs = require('fs');

function loadBundled(name) {
  const candidates = [
    path.join(__dirname, '..', '..', 'models', name),
    process.resourcesPath ? path.join(process.resourcesPath, 'models', name) : null,
  ].filter(Boolean);
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim(); } catch {}
  }
  return '';
}
const BUNDLED_CV = loadBundled('cv_caio.md');
const BUNDLED_PROJECTS = loadBundled('projects.md');
const BUNDLED_INTERVIEW_CONTEXT = [
  loadBundled('qa_bank_engia.md'),
  loadBundled('builders_interview_prep.md'),
  loadBundled('tenda_context.md'),
].filter(Boolean).join('\n\n---\n\n');

let candidateProfile = '';
function setProfile(text) { candidateProfile = (text || '').trim(); }

async function suggestStream(contextText, onDelta, abortSignal) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY missing');

  const cvBlock = BUNDLED_CV
    ? `CURRÍCULO OFICIAL DO CANDIDATO (base de tudo, usar como fonte primária de fatos, cargos, datas, stacks):\n"""\n${BUNDLED_CV}\n"""\n\n`
    : '';
  const profileBlock = candidateProfile
    ? `CURRÍCULO EXTRA (upload manual):\n"""\n${candidateProfile}\n"""\n\n`
    : '';
  const projectsBlock = BUNDLED_PROJECTS
    ? `${BUNDLED_PROJECTS}\n\n`
    : '';
  const interviewBlock = BUNDLED_INTERVIEW_CONTEXT
    ? `CONTEXTO DA VAGA + ROTEIRO ESTUDADO (persona, empresa, perguntas esperadas, respostas preparadas — use como fonte primária quando aplicável):\n"""\n${BUNDLED_INTERVIEW_CONTEXT}\n"""\n\n`
    : '';
  const userMsg = `${cvBlock}${profileBlock}${projectsBlock}${interviewBlock}TRANSCRIÇÃO RECENTE DO ENTREVISTADOR (pt-BR):\n"""\n${contextText}\n"""\n\nInstrução: CURRÍCULO OFICIAL é a fonte primária. ROTEIRO ESTUDADO tem prioridade quando pergunta bate. Sempre cite projeto real específico quando pergunta for sobre experiência/stack.`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.5,
      stream: true,
      max_tokens: 700,
    }),
    signal: abortSignal,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${t}`);
  }

  let full = '';
  let buf = '';
  await new Promise((resolve, reject) => {
    res.body.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (payload === '[DONE]') { resolve(); return; }
        try {
          const j = JSON.parse(payload);
          const delta = j.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            onDelta(full);
          }
        } catch {}
      }
    });
    res.body.on('end', resolve);
    res.body.on('error', reject);
  });

  return full;
}

function parseBlocks(raw) {
  const parts = raw.split(/\n?---\n?/);
  const pergunta = (parts[0] || '').replace(/^PERGUNTA:\s*/i, '').trim();
  const resposta = (parts[1] || '').replace(/^RESPOSTA:\s*/i, '').trim();
  return { pergunta, resposta };
}

module.exports = { suggestStream, parseBlocks, setProfile };
