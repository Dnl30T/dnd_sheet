# 🌌 Sistema Econômico Galáctico

Um sistema econômico dinâmico e em tempo real para campanhas de D&D futuristas, com sincronização via Firebase e interface moderna.

## ✨ Funcionalidades

### 💱 Conversor de Moedas Galácticas
- **5 Moedas Diferentes**: Créditos Imperiais, Ducados Republicanos, Marcos Federados, Latinum Líquido e Cristais de Energia
- **Taxas Dinâmicas**: Flutuações automáticas baseadas em volatilidade simulada
- **Conversão em Tempo Real**: Cálculos instantâneos com validação
- **Histórico de Transações**: Registro de todas as conversões realizadas

### 📊 Visualização de Dados
- **Gráfico Interativo**: Histórico de variações das moedas
- **Filtros Personalizáveis**: Visualize moedas individuais ou todas juntas
- **Interface Responsiva**: Funciona em desktop, tablet e mobile
- **Animações Suaves**: Transições e efeitos visuais modernos

### 🔄 Sincronização Firebase
- **Dados em Tempo Real**: Atualizações automáticas a cada 30 segundos
- **Persistência**: Todos os dados são salvos no Firebase Firestore
- **Status de Conexão**: Indicadores visuais do estado da conexão
- **Fallback Offline**: Funciona mesmo sem conexão

### 📰 Sistema de Notícias
- **Notícias Dinâmicas**: Geração automática de eventos econômicos
- **Contextualização**: Notícias relacionadas às flutuações das moedas
- **Imersão**: Aumenta a atmosfera futurística da campanha

## 🚀 Como Usar

### Acesso
1. Abra a ficha de personagem principal
2. Na seção "Moedas", clique no botão **"🌌 Economia"**
3. O sistema abrirá em uma nova aba/janela

### Conversão de Moedas
1. Selecione a moeda de origem e destino
2. Digite a quantidade a ser convertida
3. Clique em **"⚡ Executar Troca"**
4. A transação será registrada no histórico

### Visualização do Gráfico
- Use os botões de filtro para mostrar moedas específicas
- O gráfico atualiza automaticamente com novos dados
- Hover sobre os pontos para ver valores detalhados

## ⚙️ Configuração Técnica

### Estrutura de Arquivos
```
galactic-economy/
├── index.html              # Interface principal
├── galactic-economy.js     # Lógica do sistema
└── README.md              # Esta documentação
```

### Dependências
- **jQuery 3.6.0**: Manipulação do DOM
- **Tailwind CSS**: Estilização
- **Firebase 9.0.0**: Banco de dados
- **Canvas API**: Renderização de gráficos

### Configuração de Moedas
As moedas são configuradas no arquivo `galactic-economy.js`:

```javascript
const CURRENCY_CONFIG = {
    'Creditos_Imperiais': { 
        name: 'Créditos Imperiais', 
        symbol: '₤', 
        color: '#d4af37',
        baseRate: 1.0
    },
    // ... outras moedas
};
```

## 🎮 Integração com Campanhas

### Para Mestres
- **Controle de Economia**: Monitore e influencie as taxas conforme a narrativa
- **Eventos Dinâmicos**: Use as flutuações para criar ganchos de aventura
- **Imersão**: O sistema adiciona realismo ao aspecto econômico

### Para Jogadores
- **Gestão de Recursos**: Otimize suas conversões conforme as taxas
- **Planejamento**: Use o histórico para identificar tendências
- **Roleplay**: As notícias oferecem contexto para decisões

## 🔧 Personalização

### Cores e Temas
Modifique as cores das moedas editando a propriedade `color` em `CURRENCY_CONFIG`.

### Volatilidade
Ajuste a volatilidade modificando o valor em `refreshExchangeRates()`:
```javascript
const volatility = 0.05; // 5% de volatilidade máxima
```

### Frequência de Atualização
Altere o intervalo de atualização:
```javascript
updateInterval = setInterval(refreshExchangeRates, 30000); // 30 segundos
```

## 🐛 Troubleshooting

### Problemas de Conexão
- Verifique se o Firebase está configurado corretamente
- Confirme se as regras do Firestore permitem leitura/escrita
- O sistema funciona offline com dados locais

### Performance
- O gráfico é otimizado para mostrar apenas as últimas 100 entradas
- Transações são limitadas a 50 entradas recentes
- Use filtros para melhorar a performance em gráficos complexos

## 🚀 Futuras Melhorias

- [ ] Sistema de alertas para flutuações extremas
- [ ] Integração com inventário de personagens
- [ ] Mercado de commodities galácticas
- [ ] Sistema de investimentos
- [ ] API para integrações externas

## 📄 Licença

Este sistema faz parte do projeto D&D Character Sheet e segue a mesma licença do projeto principal.

---

**Desenvolvido para campanhas D&D futuristas** 🚀✨
