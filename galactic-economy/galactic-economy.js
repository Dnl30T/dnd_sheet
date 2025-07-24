// ==================== SISTEMA ECONÔMICO GALÁCTICO ====================

// Configuração das moedas galácticas
const CURRENCY_CONFIG = {
    'Creditos_Imperiais': { 
        name: 'Créditos Imperiais', 
        symbol: '₤', 
        color: '#d4af37',
        baseRate: 1.0
    },
    'Ducados_Republicanos': { 
        name: 'Ducados Republicanos', 
        symbol: '₽', 
        color: '#4169e1',
        baseRate: 0.85
    },
    'Marcos_Federados': { 
        name: 'Marcos Federados', 
        symbol: '⧫', 
        color: '#228b22',
        baseRate: 1.25
    },
    'Latinum_Liquido': { 
        name: 'Latinum Líquido', 
        symbol: '⚡', 
        color: '#ff6347',
        baseRate: 3.45
    },
    'Cristais_Energia': { 
        name: 'Cristais de Energia', 
        symbol: '💎', 
        color: '#9932cc',
        baseRate: 12.7
    }
};

let economyData = {
    rates: {},
    history: [],
    lastUpdate: null,
    transactions: []
};

let economyChart = null;
let updateInterval = null;
let chartFilter = 'all';

// Inicialização quando a página carrega
$(document).ready(function() {
    initializeGalacticEconomy();
});

// Inicializar sistema econômico
function initializeGalacticEconomy() {
    console.log('🌌 Inicializando Sistema Econômico Galáctico...');
    
    updateConnectionStatus('connecting', 'Conectando ao sistema econômico...', 'Inicializando Firebase');
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar dados econômicos do Firebase
    loadEconomyData();
    
    // Atualizar taxas automaticamente a cada 30 segundos
    updateInterval = setInterval(refreshExchangeRates, 30000);
    
    // Countdown visual
    startUpdateCountdown();
}

// Configurar event listeners
function setupEventListeners() {
    $('#refresh-rates-btn').on('click', refreshExchangeRates);
    $('#refresh-all-btn').on('click', refreshAllData);
    $('#from-currency, #to-currency').on('change', updateExchangeRate);
    $('#amount-to-convert').on('input', calculateExchange);
    $('#execute-exchange').on('click', executeExchange);
    
    // Filtros do gráfico
    $('.chart-filter').on('click', function() {
        $('.chart-filter').removeClass('bg-purple-600 text-white').addClass('bg-gray-600 text-gray-300');
        $(this).removeClass('bg-gray-600 text-gray-300').addClass('bg-purple-600 text-white');
        chartFilter = $(this).data('currency');
        renderEconomyChart();
    });
}

// Atualizar status de conexão
function updateConnectionStatus(status, text, detail) {
    const statusIcon = $('#status-icon');
    const statusText = $('#status-text');
    const statusDetail = $('#status-detail');
    
    statusIcon.removeClass('pulse-animation');
    
    switch(status) {
        case 'connecting':
            statusIcon.text('🟡').addClass('pulse-animation');
            break;
        case 'connected':
            statusIcon.text('🟢');
            break;
        case 'error':
            statusIcon.text('🔴');
            break;
        case 'offline':
            statusIcon.text('⚫');
            break;
    }
    
    statusText.text(text);
    statusDetail.text(detail);
}

// Popular seletores de moeda
function populateCurrencySelectors() {
    const fromSelect = $('#from-currency');
    const toSelect = $('#to-currency');
    
    fromSelect.empty();
    toSelect.empty();
    
    Object.keys(CURRENCY_CONFIG).forEach(currency => {
        const config = CURRENCY_CONFIG[currency];
        const option = `<option value="${currency}">${config.symbol} ${config.name}</option>`;
        fromSelect.append(option);
        toSelect.append(option);
    });
    
    // Selecionar moedas diferentes por padrão
    toSelect.val(Object.keys(CURRENCY_CONFIG)[1]);
}

// Carregar dados econômicos do Firebase
async function loadEconomyData() {
    try {
        updateConnectionStatus('connecting', 'Carregando dados econômicos...', 'Consultando Firebase');
        
        const economyRef = db.collection('galactic_economy').doc('current_rates');
        const docSnap = await economyRef.get();
        
        if (docSnap.exists) {
            economyData = docSnap.data();
            console.log('✅ Dados econômicos carregados:', economyData);
            updateConnectionStatus('connected', 'Sistema Online', 'Dados sincronizados');
        } else {
            console.log('📦 Criando dados iniciais...');
            await initializeEconomyRates();
            updateConnectionStatus('connected', 'Sistema Online', 'Dados inicializados');
        }
        
        populateCurrencySelectors();
        displayExchangeRates();
        renderEconomyChart();
        updateTransactionHistory();
        generateMarketNews();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados econômicos:', error);
        updateConnectionStatus('error', 'Erro de Conexão', 'Usando dados locais');
        initializeDefaultRates();
        populateCurrencySelectors();
        displayExchangeRates();
    }
}

// Inicializar taxas de câmbio padrão
async function initializeEconomyRates() {
    const currentTime = Date.now();
    
    // Gerar taxas iniciais baseadas nas taxas base com variação
    Object.keys(CURRENCY_CONFIG).forEach(currency => {
        const baseRate = CURRENCY_CONFIG[currency].baseRate;
        const variation = (Math.random() - 0.5) * 0.1; // Variação de ±5%
        economyData.rates[currency] = baseRate * (1 + variation);
    });
    
    economyData.lastUpdate = currentTime;
    economyData.history = [{
        timestamp: currentTime,
        rates: { ...economyData.rates }
    }];
    economyData.transactions = [];
    
    // Salvar no Firebase
    await saveEconomyData();
}

// Inicializar taxas padrão (offline)
function initializeDefaultRates() {
    const currentTime = Date.now();
    
    Object.keys(CURRENCY_CONFIG).forEach(currency => {
        economyData.rates[currency] = CURRENCY_CONFIG[currency].baseRate;
    });
    
    economyData.lastUpdate = currentTime;
    economyData.history = [{
        timestamp: currentTime,
        rates: { ...economyData.rates }
    }];
    economyData.transactions = [];
}

// Salvar dados econômicos no Firebase
async function saveEconomyData() {
    try {
        const economyRef = db.collection('galactic_economy').doc('current_rates');
        await economyRef.set(economyData);
        console.log('💾 Dados econômicos salvos no Firebase');
    } catch (error) {
        console.error('❌ Erro ao salvar dados econômicos:', error);
    }
}

// Atualizar taxas de câmbio
async function refreshExchangeRates() {
    console.log('🔄 Atualizando taxas de câmbio...');
    
    try {
        updateConnectionStatus('connecting', 'Atualizando taxas...', 'Calculando flutuações');
        
        const currentTime = Date.now();
        
        // Simular flutuações do mercado
        Object.keys(CURRENCY_CONFIG).forEach(currency => {
            const currentRate = economyData.rates[currency] || CURRENCY_CONFIG[currency].baseRate;
            const volatility = 0.05; // 5% de volatilidade máxima
            const change = (Math.random() - 0.5) * volatility;
            const newRate = currentRate * (1 + change);
            
            // Manter taxas dentro de limites razoáveis
            const baseRate = CURRENCY_CONFIG[currency].baseRate;
            const minRate = baseRate * 0.5;
            const maxRate = baseRate * 2.0;
            
            economyData.rates[currency] = Math.max(minRate, Math.min(maxRate, newRate));
        });
        
        // Adicionar ao histórico
        economyData.history.push({
            timestamp: currentTime,
            rates: { ...economyData.rates }
        });
        
        // Manter apenas últimas 100 entradas
        if (economyData.history.length > 100) {
            economyData.history = economyData.history.slice(-100);
        }
        
        economyData.lastUpdate = currentTime;
        
        // Salvar no Firebase
        await saveEconomyData();
        
        // Atualizar interface
        displayExchangeRates();
        renderEconomyChart();
        generateMarketNews();
        updateLastUpdateTime();
        
        updateConnectionStatus('connected', 'Sistema Online', 'Taxas atualizadas');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar taxas:', error);
        updateConnectionStatus('error', 'Erro na Atualização', 'Tentando reconectar...');
    }
}

// Atualizar todos os dados
async function refreshAllData() {
    await refreshExchangeRates();
    updateTransactionHistory();
}

// Exibir taxas de câmbio
function displayExchangeRates() {
    const ratesContainer = $('#current-rates');
    ratesContainer.empty();
    
    Object.keys(CURRENCY_CONFIG).forEach(currency => {
        const config = CURRENCY_CONFIG[currency];
        const rate = economyData.rates[currency] || config.baseRate;
        
        // Calcular mudança percentual
        let changePercent = 0;
        let changeClass = 'rate-neutral';
        if (economyData.history.length > 1) {
            const previousRate = economyData.history[economyData.history.length - 2].rates[currency];
            if (previousRate) {
                changePercent = ((rate - previousRate) / previousRate) * 100;
                changeClass = changePercent > 0 ? 'rate-positive' : changePercent < 0 ? 'rate-negative' : 'rate-neutral';
            }
        }
        
        const changeSymbol = changePercent > 0 ? '↗️' : changePercent < 0 ? '↘️' : '➡️';
        
        const rateCard = `
            <div class="currency-card ${changeClass} p-4 rounded-lg border-2" style="border-color: ${config.color}40">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl" style="color: ${config.color}">${config.symbol}</span>
                        <span class="font-semibold text-white">${config.name}</span>
                    </div>
                    <span class="text-lg">${changeSymbol}</span>
                </div>
                <div class="flex justify-between items-end">
                    <div>
                        <div class="text-2xl font-bold text-white">${rate.toFixed(4)}</div>
                        <div class="text-sm text-gray-300">Taxa atual</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-medium">
                            ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%
                        </div>
                        <div class="text-xs text-gray-400">Variação</div>
                    </div>
                </div>
            </div>
        `;
        
        ratesContainer.append(rateCard);
    });
    
    updateExchangeRate();
}

// Atualizar taxa de câmbio do conversor
function updateExchangeRate() {
    const fromCurrency = $('#from-currency').val();
    const toCurrency = $('#to-currency').val();
    
    if (!fromCurrency || !toCurrency) return;
    
    if (fromCurrency === toCurrency) {
        $('#exchange-rate').text('1.0000');
        $('#exchange-warning').removeClass('hidden');
        $('#execute-exchange').prop('disabled', true);
        return;
    }
    
    $('#exchange-warning').addClass('hidden');
    $('#execute-exchange').prop('disabled', false);
    
    const fromRate = economyData.rates[fromCurrency] || CURRENCY_CONFIG[fromCurrency].baseRate;
    const toRate = economyData.rates[toCurrency] || CURRENCY_CONFIG[toCurrency].baseRate;
    const exchangeRate = toRate / fromRate;
    
    $('#exchange-rate').text(exchangeRate.toFixed(4));
    calculateExchange();
}

// Calcular conversão
function calculateExchange() {
    const amount = parseFloat($('#amount-to-convert').val()) || 0;
    const exchangeRate = parseFloat($('#exchange-rate').text()) || 0;
    const convertedAmount = amount * exchangeRate;
    
    $('#converted-amount').text(convertedAmount.toFixed(4));
}

// Executar troca
async function executeExchange() {
    const fromCurrency = $('#from-currency').val();
    const toCurrency = $('#to-currency').val();
    const amount = parseFloat($('#amount-to-convert').val()) || 0;
    const exchangeRate = parseFloat($('#exchange-rate').text()) || 0;
    const convertedAmount = amount * exchangeRate;
    
    if (amount <= 0) {
        alert('Por favor, insira um valor válido para conversão.');
        return;
    }
    
    if (fromCurrency === toCurrency) {
        alert('Não é possível trocar uma moeda por ela mesma!');
        return;
    }
    
    // Registrar transação
    const transaction = {
        timestamp: Date.now(),
        from: fromCurrency,
        to: toCurrency,
        amount: amount,
        convertedAmount: convertedAmount,
        rate: exchangeRate
    };
    
    economyData.transactions.push(transaction);
    
    // Manter apenas últimas 50 transações
    if (economyData.transactions.length > 50) {
        economyData.transactions = economyData.transactions.slice(-50);
    }
    
    await saveEconomyData();
    
    // Mostrar resultado
    const fromConfig = CURRENCY_CONFIG[fromCurrency];
    const toConfig = CURRENCY_CONFIG[toCurrency];
    
    alert(`✅ Troca executada com sucesso!\n${amount} ${fromConfig.symbol} ${fromConfig.name} → ${convertedAmount.toFixed(4)} ${toConfig.symbol} ${toConfig.name}`);
    
    // Limpar campos
    $('#amount-to-convert').val('');
    $('#converted-amount').text('0.0000');
    
    updateTransactionHistory();
}

// Atualizar histórico de transações
function updateTransactionHistory() {
    const historyContainer = $('#transaction-history');
    historyContainer.empty();
    
    if (economyData.transactions.length === 0) {
        historyContainer.append(`
            <div class="text-center py-8 text-gray-400">
                <span class="text-4xl block mb-2">📊</span>
                <p>Nenhuma transação realizada ainda</p>
                <p class="text-sm mt-1">Execute uma conversão para ver o histórico</p>
            </div>
        `);
        return;
    }
    
    economyData.transactions.slice(-10).reverse().forEach(transaction => {
        const fromConfig = CURRENCY_CONFIG[transaction.from];
        const toConfig = CURRENCY_CONFIG[transaction.to];
        const date = new Date(transaction.timestamp).toLocaleString('pt-BR');
        
        const transactionItem = `
            <div class="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        <span style="color: ${fromConfig.color}" class="font-bold">${fromConfig.symbol} ${transaction.amount}</span>
                        <span class="text-gray-400">→</span>
                        <span style="color: ${toConfig.color}" class="font-bold">${toConfig.symbol} ${transaction.convertedAmount.toFixed(4)}</span>
                    </div>
                    <span class="text-xs text-gray-400">${date}</span>
                </div>
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-400">Taxa: ${transaction.rate.toFixed(4)}</span>
                    <span class="text-green-400">✅ Concluída</span>
                </div>
            </div>
        `;
        
        historyContainer.append(transactionItem);
    });
}

// Renderizar gráfico da economia
function renderEconomyChart() {
    const canvas = document.getElementById('economy-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Limpar canvas
    ctx.clearRect(0, 0, width, height);
    
    if (economyData.history.length < 2) {
        // Mostrar mensagem quando não há dados suficientes
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Dados insuficientes para gráfico', width/2, height/2);
        ctx.font = '14px Arial';
        ctx.fillText('Aguarde mais atualizações de taxa', width/2, height/2 + 30);
        return;
    }
    
    // Configurações do gráfico
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Determinar quais moedas mostrar
    const currenciesToShow = chartFilter === 'all' ? Object.keys(CURRENCY_CONFIG) : [chartFilter];
    
    // Encontrar valores min e max
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    currenciesToShow.forEach(currency => {
        economyData.history.forEach(entry => {
            const value = entry.rates[currency];
            if (value < minValue) minValue = value;
            if (value > maxValue) maxValue = value;
        });
    });
    
    const valueRange = maxValue - minValue;
    if (valueRange === 0) return;
    
    // Desenhar grade
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Linhas horizontais
    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Linhas verticais
    const timePoints = Math.min(economyData.history.length, 10);
    for (let i = 0; i <= timePoints; i++) {
        const x = padding + (i / timePoints) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
    }
    
    // Desenhar eixos
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    // Eixo Y
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // Eixo X
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Labels dos eixos
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    
    // Labels Y (valores)
    for (let i = 0; i <= 5; i++) {
        const value = minValue + (maxValue - minValue) * (1 - i / 5);
        const y = padding + (i / 5) * chartHeight;
        ctx.fillText(value.toFixed(2), padding - 10, y + 4);
    }
    
    // Desenhar linhas das moedas
    currenciesToShow.forEach(currency => {
        const config = CURRENCY_CONFIG[currency];
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        economyData.history.forEach((entry, index) => {
            const x = padding + (index / (economyData.history.length - 1)) * chartWidth;
            const normalizedValue = (entry.rates[currency] - minValue) / valueRange;
            const y = height - padding - normalizedValue * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Pontos
        ctx.fillStyle = config.color;
        economyData.history.forEach((entry, index) => {
            const x = padding + (index / (economyData.history.length - 1)) * chartWidth;
            const normalizedValue = (entry.rates[currency] - minValue) / valueRange;
            const y = height - padding - normalizedValue * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    });
    
    // Legenda
    if (chartFilter === 'all') {
        let legendY = 20;
        Object.keys(CURRENCY_CONFIG).forEach(currency => {
            const config = CURRENCY_CONFIG[currency];
            ctx.fillStyle = config.color;
            ctx.fillRect(20, legendY, 15, 15);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${config.symbol} ${config.name}`, 45, legendY + 12);
            
            legendY += 25;
        });
    }
}

// Gerar notícias do mercado
function generateMarketNews() {
    const newsContainer = $('#economic-news');
    newsContainer.empty();
    
    const newsTemplates = [
        "🚀 Setor de mineração espacial influencia flutuações do {currency}",
        "🌌 Nova rota comercial galáctica impacta mercado de {currency}",
        "🤝 Acordo comercial entre sistemas estelares estabiliza {currency}",
        "💎 Descoberta de novos depósitos afeta valor do {currency}",
        "⚔️ Conflito em setor distante causa volatilidade no {currency}",
        "🔬 Avanços tecnológicos impulsionam demanda por {currency}",
        "⚖️ Regulamentação imperial afeta circulação de {currency}",
        "🛡️ Aliança comercial fortalece posição do {currency}",
        "🌟 Revolução energética aumenta interesse no {currency}",
        "📡 Descoberta de civilização antiga move mercado de {currency}"
    ];
    
    // Gerar 4-6 notícias aleatórias
    const numNews = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numNews; i++) {
        const template = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
        const currencies = Object.keys(CURRENCY_CONFIG);
        const currency = currencies[Math.floor(Math.random() * currencies.length)];
        const config = CURRENCY_CONFIG[currency];
        
        const headline = template.replace('{currency}', config.name);
        const timestamp = Date.now() - Math.random() * 3600000; // Últimas horas
        const date = new Date(timestamp).toLocaleString('pt-BR');
        
        const newsItem = `
            <div class="news-item p-4 border-l-4" style="border-color: ${config.color}">
                <div class="font-medium text-white mb-1">${headline}</div>
                <div class="text-xs text-gray-400">${date}</div>
            </div>
        `;
        
        newsContainer.append(newsItem);
    }
}

// Atualizar timestamp da última atualização
function updateLastUpdateTime() {
    if (economyData.lastUpdate) {
        const lastUpdate = new Date(economyData.lastUpdate);
        $('#last-update').text(`Última atualização: ${lastUpdate.toLocaleTimeString('pt-BR')}`);
    }
}

// Iniciar countdown para próxima atualização
function startUpdateCountdown() {
    setInterval(() => {
        if (economyData.lastUpdate) {
            const now = Date.now();
            const nextUpdate = economyData.lastUpdate + 30000; // +30 segundos
            const timeLeft = Math.max(0, nextUpdate - now);
            
            if (timeLeft === 0) {
                $('#next-update-countdown').text('Atualizando...');
            } else {
                const seconds = Math.ceil(timeLeft / 1000);
                $('#next-update-countdown').text(`Próxima: ${seconds}s`);
            }
        }
    }, 1000);
}

// Limpeza quando a página é fechada
$(window).on('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
