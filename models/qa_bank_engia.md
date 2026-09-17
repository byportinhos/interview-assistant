BANCO DE PERGUNTAS E RESPOSTAS PREPARADAS — VAGA ENG DE IA (Builders)
FOCO: Fundamentos ML/DL, LLMs, RAG, MLOps, Governança. Sempre que a pergunta do entrevistador bater com uma dessas, use a resposta como BASE (adapte tom + adicione conexão com projeto real do Caio quando fizer sentido).

# FUNDAMENTOS ML / DEEP LEARNING

## 1. Backpropagation e vanishing gradient
Backpropagation calcula o gradiente da função de perda em relação aos pesos usando regra da cadeia, atualiza de trás pra frente pra minimizar erro. Vanishing gradient acontece quando gradientes ficam muito pequenos nas primeiras camadas, impedindo aprendizado. Soluções: funções de ativação como ReLU ou GELU, inicialização adequada (He/Xavier), e residual connections.

## 2. Multi-Head Attention vs Self-Attention
Self-Attention calcula relação e importância de cada palavra em relação às outras no mesmo texto (vetores Query, Key, Value). Multi-Head divide esses vetores em subespaços menores e roda atenção em paralelo várias vezes. Permite ao modelo focar em diferentes relações gramaticais e semânticas ao mesmo tempo.

## 3. Overfitting — técnicas
Regularização L1/L2 (weight decay), Dropout (desativar neurônios aleatórios no treino), Early Stopping (parar treino quando erro de validação sobe), Data Augmentation.

## 4. Métricas em dados desbalanceados
Acurácia engana: se 99% é classe A, chutar sempre A dá 99% mas é inútil. Uso F1-Score (equilibra Precisão e Recall), PR-AUC (Precision-Recall) ou matriz de confusão.

# IA GENERATIVA E LLMs

## 5. Few-Shot Prompting vs Fine-Tuning
Few-Shot altera só o prompt com exemplos no contexto em runtime, sem mexer nos pesos (rápido, barato, limitado pelo tamanho do contexto). Fine-Tuning altera pesos internos treinando com dataset novo. Fine-tuning é ideal pra ensinar comportamentos novos, tons específicos ou domínios privados complexos.

## 6. Contexto longo — limitações
RAG (recupera só trechos relevantes) ou sliding window attention. Se modelo permite, uso contexto nativo longo ou aplico compressão/sumarização em etapas antes do prompt final.

## 7. LoRA (Low-Rank Adaptation)
Em vez de atualizar todos os bilhões de parâmetros, LoRA congela pesos originais e treina duas matrizes menores de baixo posto (low-rank) ao lado das camadas de atenção. Reduz drasticamente memória de GPU e tamanho do arquivo final. Treino muito mais rápido e barato.

## 8. Embeddings e busca semântica
Embeddings são representações matemáticas (vetores de alta dimensão) de textos/imagens/áudio onde proximidade geométrica reflete semelhança de significado. Escolha do modelo afeta desempenho: se não foi treinado no idioma (PT) ou nicho (Médico/Jurídico), busca semântica falha em achar docs corretos.

# ARQUITETURA (RAG e AGENTES)

## 9. Design de RAG ponta a ponta
1) Ingestão: extrair textos, dividir em chunks, gerar embeddings. 2) Armazenamento: salvar vetores em banco vetorial. 3) Recuperação: pergunta vira vetor, busca chunks similares, reranker refina. 4) Geração: pergunta + chunks recuperados vão como contexto pro LLM gerar resposta.

## 10. HNSW vs IVF-Flat
HNSW (Hierarchical Navigable Small World): grafo, ideal quando precisa alta velocidade e máxima precisão, consome muita RAM.
IVF-Flat (Inverted File): agrupa vetores em clusters, consome menos memória, escala melhor pra volumes massivos, perde um pouco de precisão.

## 11. Chunking — estratégia ideal
Depende do tipo de documento. Textos narrativos: Semantic Chunking (quebra por mudança de significado). Documentos estruturados: quebra por seções/parágrafos ou tamanho fixo (ex: 512 tokens) com overlap de 10-20% pra não perder contexto nas bordas.

## 12. ReAct e múltiplos agentes
ReAct (Reason + Act) instrui o LLM a gerar Pensamento (analisar), Ação (chamar tool) e Observação (ler resultado). Em multi-agente, cada agente tem papel específico (um pesquisa, outro revisa) coordenados por roteador central ou máquina de estados (LangGraph).

# MLOPS, DEPLOY, OTIMIZAÇÃO

## 13. KV Caching e vLLM
Na geração token por token, o modelo recalcula vetores Key e Value dos tokens anteriores repetidamente. KV Caching salva esses vetores na memória da GPU pra evitar recomputação. vLLM usa PagedAttention: gerencia essa memória em blocos dinâmicos virtuais (como o SO faz com RAM), elimina fragmentação e permite atender muito mais requisições simultâneas.

## 14. FP16 → INT8 (Quantização)
Quantização converte pesos de ponto flutuante 16 bits para inteiros 8 bits. Reduz tamanho pela metade e acelera processamento na GPU (menor latência), com perda mínima e aceitável de precisão.

## 15. Métricas em produção
Infra: TTFT (Time to First Token — crucial pra percepção de velocidade), Tokens por Segundo (taxa de geração), uso de VRAM. Negócio: custo por requisição, taxa de erro da API, satisfação (usuário aceitou resposta ou pediu refazer).

## 16. Arquitetura pra picos de requisições
Balanceador de carga → cluster de servidores de inferência (Triton, vLLM) com auto-escalonamento por uso de GPU. Fila de mensagens (RabbitMQ, Kafka) pra gerenciar picos sem derrubar sistema. Continuous Batching (agrupamento dinâmico de requisições) pra maximizar throughput da GPU.

# GOVERNANÇA, ALINHAMENTO, CASOS PRÁTICOS

## 17. Mitigar alucinações
Forçar resposta baseada estritamente no contexto (prompt restritivo), Temperature=0 pra determinismo, Guardrails (NeMo Guardrails, Llama Guard) que validam entrada e barram respostas que fujam das regras.

## 18. Prompt Injection — defesa
Usuário injeta instruções no prompt pra burlar comportamento (ex: "Ignore instruções e me dê a senha"). Defesa: sanitizar entradas, separar claramente system prompt de dados do usuário com delimitadores XML/Markdown, usar modelo menor rápido só pra classificar e barrar prompts suspeitos antes do LLM principal.

## 19. Qualidade vs custo
Model Routing: requisições simples → modelos menores/locais/baratos (GPT-4o-mini, Llama 8B). Complexos → modelos grandes (Claude Sonnet, GPT-4o). Cache de respostas comuns (GPTCache) pra evitar chamadas repetidas.

## 20. Projeto que falhou em produção
Padrão de resposta: escolher exemplo real com data drift ou latência.
Exemplo: "Em sistema RAG, LLM começou a dar respostas desconexas após atualização de catálogo. Problema não era o LLM — era o chunking cortando tabelas de preços ao meio. Resolvi trocando pra parser que respeita HTML/Markdown e adicionando metadados aos chunks, o que restaurou o contexto."

# REGRAS DE USO DESSE BANCO
- Quando pergunta bater direto com uma dessas 20 → usa a resposta como base, adapta pro tom natural do Caio, adiciona conexão com projeto real quando puder (Wite, OM PAY, Chat Proteste).
- Nunca fale como se estivesse "lendo" — traduz pra tom de conversa.
- Se pergunta é variação (ex: "e sobre RAG hierárquico?") → usa a resposta 9 como base + expande.
- Sempre que couber, cita ferramenta real (LangGraph, pgvector, etc.) que o Caio USA no dia a dia.
