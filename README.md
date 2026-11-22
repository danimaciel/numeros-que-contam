# Números que Contam

Gerador de vídeos verticais (1080×1920, 30 s) com dados animados, no estilo da série **Café em Números**.

Quem usa preenche um formulário (textos, números, fotos) e baixa um MP4 pronto para redes sociais. O vídeo é gerado **dentro do navegador**: nada é enviado para servidor nenhum. Por isso a ferramenta pode ser hospedada de graça no GitHub Pages e usada por qualquer pessoa, sem conta no GitHub.

## Como usar

1. Abra a página. Recomendamos o **Google Chrome** ou o **Microsoft Edge**.
2. Em **Projeto**, preencha:
   - o tema (ex.: *Trigo*);
   - as cores;
   - a cor de fundo (escura, que a cartela final também acompanha);
   - o símbolo do fundo;
   - a música.
3. Em **Cenas**, monte o vídeo com 4 a 7 cenas. O tempo de cada cena é ajustado sozinho para o vídeo fechar em 30 s.

   | Cena | Para quê |
   |---|---|
   | Abertura com foto | Pergunta ou título forte sobre uma foto |
   | Número em destaque | Um número grande que sobe. Se terminar em `%`, vira um anel. Aceita foto embaixo |
   | Dois números lado a lado | Comparar duas grandezas |
   | Proporção (1 em cada N) | Bonecos que mostram “1 em cada 6”, “37 em cada 100” |
   | Ranking (barras) | Até 8 itens, no formato `Nome; valor` |
   | Evolução no tempo (linha) | Série anual, no formato `Ano; valor`, com o pico destacado |
   | Mapa do Brasil por estado | Formato `UF; valor` ou `Nome do estado; valor` |
   | Frase de impacto | Frase grande, com foto de fundo opcional |
   | Chamada final (link) | Convite para acessar um painel ou site, com print opcional |

4. Em **Cartela final**, ajuste a chamada, o nome do painel, o logo, as unidades e o link. Ela ocupa os últimos 4 s.
5. Clique em **Gerar vídeo MP4**. Leva cerca de 30 s a 1 min.

**Destaques no texto:**
- `*palavras*` ficam na cor principal;
- `~palavras~` ficam na cor secundária;
- `_palavras_` ficam em itálico;
- `|` quebra a linha.

**Números:** use o formato brasileiro, como `1.855.894` ou `17,2%`. Também valem prefixos e sufixos, como `R$ 338,8 bi`.

**Salvar projeto** baixa um arquivo `.json` com tudo, inclusive as imagens. Para continuar depois ou passar para um colega, use **Abrir projeto**. O navegador também guarda o último projeto sozinho.

## Cartela avulsa

A página `cartela.html` (link **Cartela avulsa** no topo do gerador) gera só a cartela de fechamento da Embrapa Territorial, com a arte "mudança de escala" e 5 s de duração, para colar no fim de vídeos editados em outros programas.
- **Formatos:** vertical 9:16 ou horizontal 16:9.
- **Campos editáveis:** marca, chamada, nome do painel, logo, assinatura e link.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `numeros-que-contam`) e envie esta pasta para ele.
2. No repositório, vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, depois a branch `main` e a pasta `/ (root)`.
3. Em 1 ou 2 minutos, o site fica disponível em `https://SEU-USUARIO.github.io/numeros-que-contam/`.

O arquivo `.nojekyll` faz o GitHub servir os arquivos como estão.

Para testar no seu computador, rode o comando abaixo e abra `http://localhost:8000`:

```
python -m http.server 8000
```

Abrir o `index.html` direto com dois cliques não funciona, porque o navegador bloqueia o carregamento das músicas.

## Como o código está organizado

| Arquivo | O que faz |
|---|---|
| `js/engine.js` | Motor de animação em canvas: texto que entra palavra por palavra, contadores, fotos com movimento, fundo, cabeçalho e transições |
| `js/blocks.js` | Os tipos de cena (`BLOCKS`), a cartela final e a montagem da linha do tempo |
| `js/audio.js` | Mistura da música com os efeitos sonoros (Web Audio) |
| `js/export.js` | Gera o MP4 com WebCodecs + [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) |
| `js/app.js` | Interface: formulário, prévia, salvar e abrir |
| `js/exemplo.js` | Projeto de exemplo (café) e projeto em branco |
| `js/geo-br.js` | Contornos dos estados brasileiros |

**Criar um tipo de cena novo:** acrescente uma entrada em `BLOCKS` (em `js/blocks.js`) com:
- `nome`;
- `campos`, que o formulário monta sozinho;
- `make(dados)`, que devolve `draw(ctx, tempoLocal, duração)`.

O desenho é feito em coordenadas de 1080×1920.

## Créditos e licenças: confira antes de publicar

- **Fontes DejaVu:** licença livre, permite redistribuição.
- **Músicas** (`assets/musicas`): faixas de Dmitrii Kolesnikov, do Pixabay. A licença do Pixabay permite usar nos vídeos, mas não permite redistribuir os arquivos de áudio isoladamente. Avalie se pode deixá-las num repositório público ou se é melhor trocá-las.
- **Fotos de exemplo** (`assets/exemplo`): Renata Silva e Marcos Oliveira, do vídeo da série Café em Números. Confirme a autorização para uso público.
- **Logo da Embrapa:** marca institucional. Use conforme o manual de marca.
