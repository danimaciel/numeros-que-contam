// ===== Projeto de exemplo: Café (dados usados na série Café em Números) =====
const EX = 'assets/exemplo/';
const FONTE_CENSO = 'Fonte: IBGE, Censo Agropecuário 2017, Tabela 6768 · produtores rurais nos 1.959 municípios com café';
const EXEMPLO = {
  serie: 'Números que Contam', tema: 'Café', cor: '#E3B76F', cor2: '#6FBF8A', simbolo: 'grao', musica: 'inovacao', efeitos: true, vinheta: { ativa: true, episodio: '1' },
  blocos: [
    { tipo: 'abertura', dados: { titulo: 'Quanto café o|Brasil colheu em|*11 safras?*', foto: EX + 'landscape.jpg', credito: 'Renata Silva' } },
    { tipo: 'numero', dados: { intro: 'De 2014 a 2024,|o Brasil colheu', numero: '572,2', legenda: 'milhões de sacas de 60 kg', complemento: '= *34,3 bilhões* de quilos de café', foto: EX + 'drying.jpg', fonte: 'Fonte: IBGE/Sidra, Tabela 5457 · soma das safras 2014–2024' } },
    { tipo: 'proporcao', dados: { titulo: 'Quem está|à frente do *campo?*', parte: '1', total: '6', legenda: 'produtores nos municípios|do café é *mulher.*', fonte: FONTE_CENSO } },
    { tipo: 'mapa', dados: { titulo: 'Onde há mais|*mulheres* produtoras?', valores: 'PE; 27,9\nBA; 23,2\nPA; 21,7\nAC; 20,6\nMS; 20,5\nAM; 20,3\nCE; 20,2\nMT; 16,3\nRJ; 16,1\nRO; 15,7\nGO; 15,0\nMG; 14,3\nES; 13,6\nPR; 12,9\nSP; 12,8', sufixo: '%', zoom: true, fonte: FONTE_CENSO + ' · estados com 20 mil produtores ou mais' } },
    { tipo: 'ranking', dados: { titulo: 'Para cada produtor|jovem, quantos têm|*65 anos ou mais?*', itens: 'Sudeste; 22,2\nCentro-Oeste; 17,9\nSul; 17,9\nNordeste; 11,4\nNorte; 4,7', sufixo: '', destaques: '1', fonte: FONTE_CENSO + ' · índice de envelhecimento' } },
    { tipo: 'fechamento', dados: { titulo: 'Explore os dados|do *café brasileiro.*', imagem: EX + 'print-painel.png', chamada: 'Acesse o painel', link: 'embrapa.br/web/cafe/painel-cafe-em-numeros', fonte: 'Painel Café em Números · Embrapa Café e Embrapa Territorial' } },
  ],
  cartela: {
    ativa: true, chamada: 'Conheça o Brasil que produz café!', titulo: 'Painel Café em Números', subtitulo: 'A cafeicultura brasileira em dados, num só lugar.',
    logo: EX + 'logo-embrapa.png', assinatura: 'Embrapa Café | Embrapa Territorial', link: 'www.embrapa.br/web/cafe/painel-cafe-em-numeros'
  }
};
const VAZIO = {
  serie: 'Números que Contam', tema: '', cor: '#E3B76F', cor2: '#6FBF8A', simbolo: 'circulos', musica: 'inovacao', efeitos: true, vinheta: { ativa: true, episodio: '' },
  blocos: [{ tipo: 'abertura', dados: {} }, { tipo: 'numero', dados: {} }, { tipo: 'ranking', dados: {} }, { tipo: 'frase', dados: {} }, { tipo: 'fechamento', dados: {} }],
  cartela: { ativa: true, chamada: '', titulo: '', subtitulo: '', logo: EX + 'logo-embrapa.png', assinatura: 'Embrapa Territorial', link: 'www.embrapa.br/territorial' }
};
