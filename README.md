# Ficha de Personagem D&D - Ordem Futurista

Uma ficha de personagem interativa para D&D 5e com tema futurista, desenvolvida com HTML, CSS (Tailwind), jQuery e elementos temáticos cyberpunk minimalistas.

## ✨ Características Principais

### 🎯 Sistema Point Buy
- Sistema de distribuição de pontos para atributos (27 pontos)
- Todos os atributos começam em 8
- Custos progressivos: 8=0pts, 9=1pt, 10=2pts, 11=3pts, 12=4pts, 13=5pts, 14=7pts, 15=9pts
- Desativa automaticamente quando valores são alterados manualmente
- Indicador visual de pontos restantes

### 🧬 Aprimoramentos Genéticos
- Seção dedicada para modificações genéticas
- Campo para efeitos colaterais
- **Nível de Rejeição**: Barra de status com porcentagem (0-100%)
- Cores dinâmicas baseadas no nível (verde → amarelo → laranja → vermelho)

### 🔧 Aprimoramentos Mecânicos
- Seção para implantes e próteses
- Campo para necessidades de manutenção
- **Sobrecarga Neural**: Barra de status com porcentagem (0-100%)
- Sistema de cores progressivo para indicar risco

### ⚔️ Status de Combate Aprimorado
- **Status Blight** integrado aos status de combate
- Exibição de porcentagem em tempo real
- Cores dinâmicas conforme o nível de blight
- Testes contra a morte com checkboxes personalizados

### 🎲 Funcionalidades Existentes
- Cálculo automático de modificadores e bônus
- Sistema de proficiências para perícias e testes de resistência
- Gerenciamento de ataques dinâmico
- Sistema de dados com modal interativo
- Salvamento automático no localStorage
- Importação/exportação de fichas
- Design responsivo e minimalista

## 🎨 Design & Tema

### Paleta de Cores Futurista
- **Preto Sideral** (#1A1A1A) - Fundo principal
- **Azul Elétrico** (#4A90E2) - Acentos e focos
- **Roxo Profundo** (#6B73FF) - Títulos e destaques
- **Verde Esmeralda** (#2ECC71) - Elementos positivos/vida
- **Cinza Grafite** (#404040) - Elementos secundários
- **Prata Metálico** (#C0C0C0) - Detalhes

### Filosofia de Design
- **Minimalismo Futurista**: Clean, funcional, sem excessos
- **Feedback Visual**: Estados dinâmicos e animações sutis
- **Acessibilidade**: Contrastes adequados e navegação intuitiva
- **Responsividade**: Otimizado para desktop, tablet e mobile

## 🚀 Tecnologias

- **HTML5**: Estrutura semântica
- **Tailwind CSS**: Framework utilitário com customizações
- **jQuery 3.6.0**: Interatividade e manipulação DOM
- **CSS3**: Animações e efeitos personalizados
- **LocalStorage**: Persistência de dados local

## 📱 Funcionalidades dos Status

### Status Blight (0-100%)
- **0-25%**: Verde (baixo risco)
- **26-50%**: Degradê verde-amarelo (risco moderado)
- **51-75%**: Degradê amarelo-vermelho (alto risco)
- **76-100%**: Vermelho (crítico)

### Nível de Rejeição (0-100%)
- **0-25%**: Verde (estável)
- **26-50%**: Amarelo (atenção)
- **51-75%**: Laranja (cuidado)
- **76-100%**: Vermelho (rejeição crítica)

### Sobrecarga Neural (0-100%)
- **0-25%**: Verde (funcionamento normal)
- **26-50%**: Amarelo (aquecimento)
- **51-75%**: Laranja (sobrecarga)
- **76-100%**: Vermelho (risco de falha)

## 🎯 Como Usar

1. **Point Buy**: Ative/desative o sistema usando o checkbox
2. **Atributos**: Distribua os 27 pontos entre os 6 atributos
3. **Aprimoramentos**: Documente modificações genéticas e mecânicas
4. **Status**: Use os sliders para monitorar blight, rejeição e sobrecarga
5. **Salvamento**: A ficha salva automaticamente no navegador

## 📋 Estrutura de Arquivos

```
simple_character_sheet/
├── index.html          # Estrutura principal
├── styles.css          # Estilos customizados mínimos
├── script.js          # Lógica JavaScript/jQuery
└── README.md          # Este arquivo
```

## 🔄 Atualizações Recentes

### v2.0 - Sistema Point Buy e Aprimoramentos
- ✅ Implementado sistema Point Buy automático
- ✅ Adicionadas seções de Aprimoramentos Genéticos
- ✅ Adicionadas seções de Aprimoramentos Mecânicos
- ✅ Status Blight movido para Status de Combate
- ✅ Barras de status com porcentagens dinâmicas
- ✅ Sistema de cores progressivo para todos os status
- ✅ Persistência completa dos novos dados

### Melhorias de UX
- Interface mais intuitiva e organizadas
- Feedback visual aprimorado
- Responsividade otimizada
- Performance melhorada

---

*Desenvolvido para campanhas de D&D 5e com ambientação futurista e elementos cyberpunk.*
