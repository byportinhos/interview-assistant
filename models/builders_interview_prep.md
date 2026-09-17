CONTEXTO DA ENTREVISTA — VAGA BUILDERS (entrevista técnica com foco em IA/dados/agentes)

# PERFIL DO ENTREVISTADOR (líder técnico de engenharia de dados)
- Liderança técnica de time de engenharia de dados, referência de arquitetura, padrões e práticas.
- Responsável pela plataforma de dados em GCP, foco em escalabilidade, governança, eficiência e desenvolvimento do time.
- Principais responsabilidades:
  - Arquitetura Lakehouse em GCP (BigQuery, Cloud Composer, Cloud Run, Dataplex), Arquitetura Medalhão (bronze/silver/gold) com governança e catalogação centralizadas.
  - IaC (Terraform), esteiras CI/CD padronizadas, ambientes versionados, auditáveis, reprodutíveis.
  - Liderança de pessoas: 1:1s, code reviews, PDIs, trilhas de certificação, condução de entrevistas técnicas.
  - FinOps: reduziu ~40% custo de infraestrutura via clustering, materialized views, particionamento, refatoração de pipelines críticos.
  - Interface técnica com stakeholders/cliente, traduz negócio em solução de dados, participa de decisões estratégicas.
  - Desenvolve soluções de IA generativa e agêntica com LLMs: assistentes analíticos com RAG, geração de SQL, integração com plataforma de dados.

INFERÊNCIA IMPORTANTE: entrevistador vai sondar profundidade real em RAG, agentes, otimização de custo/token, e experiência prática. Prioriza pragmatismo e resultado.

# GUIA DE ESTUDO — TÓPICOS QUE PODEM CAIR

## 1. Agentes de IA e orquestração (CORE da vaga)
- Agente = LLM + tools + memória + loop de decisão. Decide ação, executa, observa resultado, repete. Padrão ReAct (Reason + Act).
- Tool/function calling = modelo recebe schema JSON das funções, devolve qual chamar com quais argumentos. Você executa e devolve resultado.
- Orquestração multi-agente = agentes especializados coordenados (roteador + agentes de domínio). LangGraph modela como grafo de estados (nós = passos, arestas = transições).
- Fallback = se modelo/tool falha, cai pra alternativa (modelo secundário, resposta padrão, escalar pra humano).

ÂNGULO DO CAIO: faz isso com LangGraph no Wite. Fala de nós, estado, roteamento e HITL (human-in-the-loop).

## 2. RAG — pipeline completo (decorado)
1. Ingestão — carrega documentos
2. Chunking — quebra em pedaços (500-1000 tokens, com overlap pra não cortar contexto)
3. Embedding — cada chunk vira vetor (modelo de embedding)
4. Indexação — vetores em banco vetorial (pgvector no caso do Caio)
5. Retrieval — pergunta vira vetor, busca chunks mais próximos (similaridade cosseno)
6. Reranking (opcional) — reordena resultados por relevância real antes do LLM
7. Geração — LLM responde usando só os chunks recuperados

Conceitos extras:
- Busca híbrida = vetorial (semântica) + palavra-chave (BM25). Melhor que só uma.
- Por que RAG? Reduz alucinação, dá fonte, corta custo (só trecho relevante, não doc inteiro).

## 3. Prompt engineering
- System prompt = define papel, regras, tom (fixo).
- Few-shot = dar exemplos no prompt pra guiar formato.
- Structured output = forçar JSON de saída (schema), essencial pra integração.
- Chain-of-thought = pedir "pensar passo a passo" melhora raciocínio.
- Mitigar alucinação = RAG + "responda só com base no contexto, se não souber diga que não sabe" + temperatura baixa.

## 4. Otimização de token e custo (OURO — LIDERAR COM ISSO)
Vaga inteira gira aqui:
- Roteamento de modelo = tarefa simples (classificar, extrair) em modelo barato/pequeno; só raciocínio complexo no caro. Corta custo drasticamente.
- Cortar contexto via RAG = não jogar base inteira no prompt.
- Resumir histórico = conversa longa, resumir turnos antigos em vez de arrastar tudo.
- Cache de prompt = provedores cacheiam parte fixa do prompt (system + instruções). Reusa e paga menos.
- Pré-processamento/compressão = limpar, deduplicar, comprimir dados antes de mandar (a vaga cita isso literal).
- Batch = processar em lote quando não precisa tempo real (mais barato).
- Input vs output tokens = output custa 3-5x mais que input. Prompt que gera resposta enxuta economiza.

## 5. Vertex AI e Bedrock (GAP — estudou o básico)
Não usou, mas precisa conversar:
- Amazon Bedrock (AWS) = serviço gerenciado com vários modelos (Claude, Llama, Titan) por API única. Tem: Agents (agentes gerenciados), Knowledge Bases (RAG gerenciado), Guardrails (filtros).
- Vertex AI (GCP) = plataforma de ML/IA do Google. Dá Gemini + outros modelos, treino/deploy. Tem Vertex AI Agent Builder e RAG gerenciado.
- Sacada: ambos são camada gerenciada de acesso a modelos. Lógica de agente/RAG/prompt/otimização = a mesma. Muda API e infra. "Curva de dias, não meses."

FRASE PRONTA: "Consumi LLM via API direta (OpenAI, Anthropic, Gemini). Vertex e Bedrock entregam os mesmos modelos por camada gerenciada, com RAG e guardrails prontos. Raciocínio de arquitetura de agente não muda; subo no ferramental rápido."

## 6. Multi-cloud e FinOps
- Multi-cloud = rodar em mais de uma nuvem (GCP + AWS + Azure), evitar lock-in, usar melhor de cada.
- FinOps = disciplina financeira de cloud/IA: visibilidade (quanto cada agente/fluxo custa), otimização (cortar desperdício), governança (orçamento, alertas). Aplicado a IA = monitorar custo por token/requisição/caso de uso e otimizar.

ÂNGULO: "FinOps eu já pratico sem o rótulo — priorizo roadmap por impacto financeiro e otimizo custo de inferência (roteamento de modelo, RAG enxuto)."

## 7. Observabilidade de IA (gap parcial — sabe vocabulário)
- Tracing = rastrear cada passo do agente (qual tool, qual prompt, quantos tokens, quanto tempo). Ferramentas: LangSmith, Langfuse, OpenTelemetry.
- Métricas: latência, custo/tokens por requisição, taxa de erro, taxa de sucesso da tool, qualidade da resposta.
- Avaliação (evals) = medir qualidade: LLM-as-judge (modelo avalia resposta de outro), datasets de teste, testes de regressão de prompt.

## 8. Pipelines, filas, integração
- Filas (Redis/BullMQ — caso do Caio, SQS na AWS) = tarefas assíncronas, absorver picos, retry.
- Webhooks com dedup e retry = OM PAY. Idempotência (não processar mesmo evento 2x). OURO PRA "confiabilidade".
- APIs REST = integração entre sistemas.

## 9. Governança
- Guardrails = filtros entrada/saída (bloquear conteúdo tóxico, PII, prompt injection).
- Prompt injection = ataque onde usuário injeta instrução maliciosa no input pra sequestrar agente. Mitigar: separar instrução de dado, validar, guardrails.
- Rastreabilidade/auditoria = logar decisões pra auditar. Forte no Wite.

# ESTRATÉGIA DE RESPOSTA
- LIDERE com otimização de custo/token, RAG e agentes (LangGraph no Wite) — é onde tem experiência real.
- Sobre Vertex/Bedrock: seja HONESTO ("não usei diretamente"), mas mostre que a mudança é rasa ("mesma lógica, muda API").
- Sobre GCP/BigQuery/Terraform: se cair, seja honesto e reoriente pra experiência análoga (Supabase/Postgres, Vercel/Render, IaC de deploy).
- Cite projetos REAIS: Wite (LangGraph, RAG com pgvector, agentes), OM PAY (idempotência webhook, filas BullMQ), Chat Proteste (LLM analisando conversas), byPorto SaaS (Twilio + Pagar.me + n8n).
- Números quando tiver: "reduzimos X% custo", "processamos Y msgs/dia", "N usuários".
- Se não souber algo: "não trabalhei com isso ainda, mas entendo que funciona assim: [X]. Curva rápida porque já domino [Y análogo]."
