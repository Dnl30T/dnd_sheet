$(document).ready(function() {
    // Inicialização
    initializeCharacterSheet();
    
    // Event Listeners
    setupEventListeners();
    
    // Carregar dados salvos se existirem
    loadCharacterData();
    
    // Mostrar aviso sobre salvamento manual (apenas uma vez)
    if (!localStorage.getItem('save-notice-shown')) {
        setTimeout(() => {
            showNotification('💡 Lembre-se: as alterações só são salvas quando você clicar em "SALVAR FICHA"', 'info');
            localStorage.setItem('save-notice-shown', 'true');
        }, 2000);
    }
});

function initializeCharacterSheet() {
    // Inicializar Point Buy
    initializePointBuy();
    
    // Calcular modificadores iniciais
    updateAllModifiers();
    
    // Configurar barras de status
    updateBlightIndicator();
    updateRejectionLevel();
    updateNeuralOverload();
    
    // Inicializar aprimoramentos
    updateRejectionMinimum();
    updateNeuralMinimum();
    
    // Inicializar sistema econômico
    initializeEconomicSystem();
    
    // Inicializar sistema de magias
    initializeSpellSystem();
    
    // Adicionar efeitos visuais
    addVisualEffects();
}

function setupEventListeners() {
    // Point Buy System
    $('#point-buy-toggle').on('change', function() {
        togglePointBuy();
    });
    
    // Modificadores de atributos
    $('.attribute-value').on('input', function() {
        const attributeName = $(this).attr('id');
        if ($('#point-buy-toggle').prop('checked')) {
            handlePointBuyChange(attributeName);
        } else {
            updateModifier(attributeName);
            updateDependentStats();
        }
    });
    
    // Bônus de proficiência
    $('#proficiency').on('input', function() {
        updateDependentStats();
    });
    
    // Checkboxes de proficiência para testes de resistência
    $('.save-item input[type="checkbox"]').on('change', function() {
        updateSavingThrows();
    });
    
    // Checkboxes de proficiência para perícias
    $('.skill-item input[type="checkbox"]').on('change', function() {
        updateSkills();
    });
    
    // Status sliders
    $('#blight-slider').on('input', function() {
        updateBlightIndicator();
    });
    
    // Rejection e Neural são controlados automaticamente pelos aprimoramentos
    // Remover event listeners dos sliders
    
    // Aprimoramentos
    $('#add-genetic-mod').on('click', addGeneticModification);
    $('#add-mechanical-implant').on('click', addMechanicalImplant);
    
    // Event listeners para checkboxes "Ativo" existentes
    $(document).on('change', '.genetic-active', function() {
        updateGeneticActiveEffects();
    });
    
    $(document).on('change', '.implant-active', function() {
        updateMechanicalActiveEffects();
    });
    
    // Foto do personagem
    $('#character-photo-url').on('input', updateCharacterPhoto);
    
    // Botões de ação
    $('.save-btn').on('click', saveCharacterData);
    $('.load-btn').on('click', loadCharacterDataFromFile);
    $('.reset-btn').on('click', resetCharacterSheet);
    $('.dice-btn').on('click', openDiceModal);
    $('.list-characters-btn').on('click', openCharactersListModal);
    
    // Adicionar novo ataque
    $('.add-attack-btn').on('click', addNewAttack);
    
    // Modal de dados
    setupDiceModal();
    
    // Modal de lista de personagens
    setupCharactersListModal();
    
    // Debug do Firebase
    setupFirebaseDebug();
    
    // HP tracking
    setupHPTracking();
    
    // Limpar timers quando a página for fechada
    $(window).on('beforeunload', function() {
        if (economicSystem.updateInterval) {
            clearInterval(economicSystem.updateInterval);
        }
        if (economicSystem.countdownInterval) {
            clearInterval(economicSystem.countdownInterval);
        }
    });
}

// Variáveis globais para aprimoramentos
let geneticModifications = [];
let mechanicalImplants = [];

// Sistema Econômico Galáctico
let economicSystem = {
    planets: {
        cc: { name: 'Cynara', stability: 0.8, baseVariation: 2.0 },
        ck: { name: "Tarkh Vel", stability: 0.9, baseVariation: 1.5 },
        ce: { name: 'Érebo-7', stability: 0.4, baseVariation: 8.0 },
        co: { name: 'Nexorion', stability: 0.3, baseVariation: 12.0 },
        cpp: { name: 'Velessa', stability: 0.7, baseVariation: 3.5 }
    },
    currentVariations: { cc: 0, ck: 0, ce: 0, co: 0, cpp: 0 },
    history: [],
    lastUpdate: null,
    updateInterval: null,
    countdownInterval: null,
    baseRates: {
        cc: { cc: 100, ck: 120, ce: 300, co: 90, cpp: 150 },
        ck: { cc: 80, ck: 100, ce: 250, co: 75, cpp: 120 },
        ce: { cc: 30, ck: 40, ce: 100, co: 25, cpp: 45 },
        co: { cc: 110, ck: 130, ce: 320, co: 100, cpp: 160 },
        cpp: { cc: 65, ck: 80, ce: 200, co: 60, cpp: 100 }
    }
};

// Funções para gerenciar aprimoramentos genéticos
function addGeneticModification() {
    const modId = 'genetic-mod-' + Date.now();
    const modHtml = `
        <div class="genetic-mod border border-gray-300 rounded p-3 bg-gray-50" data-id="${modId}">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
                <input type="text" placeholder="Nome da modificação" class="genetic-name border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-eletrico">
                <input type="number" placeholder="Min %" class="genetic-min border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-eletrico" min="0" max="100" value="0">
                <input type="number" placeholder="Max %" class="genetic-max border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-eletrico" min="0" max="100" value="100">
                <div class="flex items-center justify-center">
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" class="genetic-active w-4 h-4 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500">
                        <span class="text-gray-700">Ativo</span>
                    </label>
                </div>
                <button class="remove-genetic bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600">Remover</button>
            </div>
            <textarea placeholder="Descrição dos efeitos..." class="genetic-description w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:border-eletrico" rows="2"></textarea>
        </div>
    `;
    
    $('#genetic-modifications-list').append(modHtml);
    updateRejectionMinimum();
    
    // Event listeners para o novo elemento
    $(`[data-id="${modId}"] .genetic-min, [data-id="${modId}"] .genetic-max`).on('input', function() {
        updateRejectionMinimum();
        updateGeneticActiveEffects();
    });
    $(`[data-id="${modId}"] .genetic-active`).on('change', function() {
        updateGeneticActiveEffects();
    });
    $(`[data-id="${modId}"] .remove-genetic`).on('click', function() {
        $(this).closest('.genetic-mod').remove();
        updateRejectionMinimum();
        updateGeneticActiveEffects();
    });
}

function addMechanicalImplant() {
    const implantId = 'mechanical-implant-' + Date.now();
    const implantHtml = `
        <div class="mechanical-implant border border-gray-300 rounded p-3 bg-gray-50" data-id="${implantId}">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
                <input type="text" placeholder="Nome do implante" class="implant-name border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-eletrico">
                <input type="number" placeholder="Min %" class="implant-min border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-eletrico" min="0" max="100" value="0">
                <input type="number" placeholder="Max %" class="implant-max border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-eletrico" min="0" max="100" value="100">
                <div class="flex items-center justify-center">
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" class="implant-active w-4 h-4 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500">
                        <span class="text-gray-700">Ativo</span>
                    </label>
                </div>
                <button class="remove-implant bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600">Remover</button>
            </div>
            <textarea placeholder="Descrição dos efeitos..." class="implant-description w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:border-eletrico" rows="2"></textarea>
        </div>
    `;
    
    $('#mechanical-implants-list').append(implantHtml);
    updateNeuralMinimum();
    
    // Event listeners para o novo elemento
    $(`[data-id="${implantId}"] .implant-min, [data-id="${implantId}"] .implant-max`).on('input', function() {
        updateNeuralMinimum();
        updateMechanicalActiveEffects();
    });
    $(`[data-id="${implantId}"] .implant-active`).on('change', function() {
        updateMechanicalActiveEffects();
    });
    $(`[data-id="${implantId}"] .remove-implant`).on('click', function() {
        $(this).closest('.mechanical-implant').remove();
        updateNeuralMinimum();
        updateMechanicalActiveEffects();
    });
}

function updateRejectionMinimum() {
    let totalMin = 0;
    $('.genetic-mod .genetic-min').each(function() {
        const minValue = parseInt($(this).val()) || 0;
        totalMin += minValue;
    });
    
    // Limitar o mínimo a 100%
    totalMin = Math.min(totalMin, 100);
    
    // Atualizar o display do mínimo
    $('#rejection-minimum').text(totalMin);
    
    // Atualizar automaticamente a barra para o valor mínimo
    $('#rejection-slider').val(totalMin);
    updateRejectionLevel();
}

function updateNeuralMinimum() {
    let totalMin = 0;
    $('.mechanical-implant .implant-min').each(function() {
        const minValue = parseInt($(this).val()) || 0;
        totalMin += minValue;
    });
    
    // Limitar o mínimo a 100%
    totalMin = Math.min(totalMin, 100);
    
    // Atualizar o display do mínimo
    $('#neural-minimum').text(totalMin);
    
    // Atualizar automaticamente a barra para o valor mínimo
    $('#neural-overload-slider').val(totalMin);
    updateNeuralOverload();
}

// Função para atualizar efeitos das modificações genéticas ativas
function updateGeneticActiveEffects() {
    let totalActiveValue = 0;
    let totalMinValue = 0;
    
    $('.genetic-mod').each(function() {
        const isActive = $(this).find('.genetic-active').is(':checked');
        const minValue = parseInt($(this).find('.genetic-min').val()) || 0;
        const maxValue = parseInt($(this).find('.genetic-max').val()) || 100;
        
        totalMinValue += minValue;
        
        if (isActive) {
            totalActiveValue += maxValue;
        }
    });
    
    // Usar o maior valor entre o mínimo total e o valor ativo total
    const finalValue = Math.max(totalMinValue, totalActiveValue);
    
    // Limitar a 100%
    const limitedValue = Math.min(finalValue, 100);
    
    // Atualizar a barra de rejeição
    $('#rejection-slider').val(limitedValue);
    updateRejectionLevel();
}

// Função para atualizar efeitos dos implantes mecânicos ativos
function updateMechanicalActiveEffects() {
    let totalActiveValue = 0;
    let totalMinValue = 0;
    
    $('.mechanical-implant').each(function() {
        const isActive = $(this).find('.implant-active').is(':checked');
        const minValue = parseInt($(this).find('.implant-min').val()) || 0;
        const maxValue = parseInt($(this).find('.implant-max').val()) || 100;
        
        totalMinValue += minValue;
        
        if (isActive) {
            totalActiveValue += maxValue;
        }
    });
    
    // Usar o maior valor entre o mínimo total e o valor ativo total
    const finalValue = Math.max(totalMinValue, totalActiveValue);
    
    // Limitar a 100%
    const limitedValue = Math.min(finalValue, 100);
    
    // Atualizar a barra neural
    $('#neural-overload-slider').val(limitedValue);
    updateNeuralOverload();
}

// === SISTEMA ECONÔMICO GALÁCTICO ===
function initializeEconomicSystem() {
    // Carregar dados do localStorage ou inicializar
    const savedEconomicData = localStorage.getItem('galacticEconomy');
    if (savedEconomicData) {
        try {
            const data = JSON.parse(savedEconomicData);
            economicSystem.currentVariations = data.currentVariations || economicSystem.currentVariations;
            economicSystem.history = data.history || [];
            economicSystem.lastUpdate = data.lastUpdate ? new Date(data.lastUpdate) : null;
        } catch (error) {
            console.error('Erro ao carregar dados econômicos:', error);
        }
    }
    
    // Verificar se precisa atualizar
    const now = new Date();
    if (!economicSystem.lastUpdate || (now - economicSystem.lastUpdate) >= 3600000) { // 1 hora
        updateEconomicVariations();
    }
    
    // Configurar timer para próxima atualização
    startEconomicTimer();
    updateEconomicDisplay();
}

function updateEconomicVariations() {
    const now = new Date();
    
    // Gerar novas variações para cada planeta
    Object.keys(economicSystem.planets).forEach(planetCode => {
        const planet = economicSystem.planets[planetCode];
        
        // Calcular variação baseada na estabilidade do planeta
        const maxVariation = planet.baseVariation;
        const stabilityFactor = planet.stability;
        
        // Variação aleatória, mas influenciada pela estabilidade
        let variation = (Math.random() - 0.5) * 2 * maxVariation;
        
        // Planetas mais estáveis têm variações menores e mais centralizadas
        variation *= (1 - stabilityFactor * 0.5);
        
        // Arredondar para 1 casa decimal
        economicSystem.currentVariations[planetCode] = Math.round(variation * 10) / 10;
    });
    
    // Adicionar ao histórico
    const historyEntry = {
        timestamp: now.getTime(),
        hour: now.getHours(),
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        variations: { ...economicSystem.currentVariations }
    };
    
    economicSystem.history.unshift(historyEntry);
    
    // Manter apenas últimas 5 entradas
    if (economicSystem.history.length > 5) {
        economicSystem.history = economicSystem.history.slice(0, 5);
    }
    
    economicSystem.lastUpdate = now;
    
    // Salvar no localStorage
    saveEconomicData();
    updateEconomicDisplay();
}

function saveEconomicData() {
    const dataToSave = {
        currentVariations: economicSystem.currentVariations,
        history: economicSystem.history,
        lastUpdate: economicSystem.lastUpdate.toISOString()
    };
    localStorage.setItem('galacticEconomy', JSON.stringify(dataToSave));
}

function startEconomicTimer() {
    // Limpar timers existentes
    if (economicSystem.updateInterval) {
        clearInterval(economicSystem.updateInterval);
    }
    if (economicSystem.countdownInterval) {
        clearInterval(economicSystem.countdownInterval);
    }
    
    // Timer para atualização a cada hora
    economicSystem.updateInterval = setInterval(() => {
        updateEconomicVariations();
    }, 3600000); // 1 hora
    
    // Timer para countdown visual
    economicSystem.countdownInterval = setInterval(() => {
        updateCountdownDisplay();
    }, 1000); // 1 segundo
}

function updateCountdownDisplay() {
    if (!economicSystem.lastUpdate) return;
    
    const now = new Date();
    const nextUpdate = new Date(economicSystem.lastUpdate.getTime() + 3600000); // +1 hora
    const timeDiff = nextUpdate - now;
    
    if (timeDiff <= 0) {
        updateEconomicVariations();
        return;
    }
    
    const minutes = Math.floor(timeDiff / 60000);
    const seconds = Math.floor((timeDiff % 60000) / 1000);
    
    const timerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    $('#next-update-timer').text(timerDisplay);
}

function updateEconomicDisplay() {
    // Atualizar status de cada planeta
    Object.keys(economicSystem.planets).forEach(planetCode => {
        const variation = economicSystem.currentVariations[planetCode];
        const $variation = $(`#${planetCode}-variation`);
        const $status = $(`#${planetCode}-status`);
        
        // Atualizar texto da variação
        const sign = variation >= 0 ? '+' : '';
        $variation.text(`${sign}${variation.toFixed(1)}%`);
        
        // Remover classes de cor e efeito anteriores
        $variation.removeClass('text-green-500 text-red-500 text-yellow-500 text-gray-600');
        $status.removeClass('high-positive high-negative');
        
        // Atualizar cor baseada na variação
        if (variation > 0) {
            $variation.addClass('text-green-500');
            if (variation > 8) $status.addClass('high-positive');
        } else if (variation < 0) {
            $variation.addClass('text-red-500');
            if (variation < -8) $status.addClass('high-negative');
        } else {
            $variation.addClass('text-gray-600');
        }
        
        // Atualizar status econômico
        const absVariation = Math.abs(variation);
        let statusText = 'Estável';
        if (absVariation > 8) {
            statusText = 'Crítico';
        } else if (absVariation > 5) {
            statusText = 'Instável';
        } else if (absVariation > 2) {
            statusText = 'Flutuante';
        }
        
        $status.find('div').text(statusText);
    });
    
    // Atualizar tabela de conversão
    updateConversionTable();
    
    // Atualizar histórico
    updateHistoryTable();
}

function updateConversionTable() {
    const tbody = $('#conversion-table-body');
    tbody.empty();
    
    Object.keys(economicSystem.baseRates).forEach(fromPlanet => {
        const fromName = economicSystem.planets[fromPlanet].name;
        const row = $('<tr class="hover:bg-gray-50"></tr>');
        
        // Coluna do planeta de origem
        row.append(`<td class="border border-gray-300 px-3 py-2 font-medium bg-gray-50">${fromPlanet.toUpperCase()} (${fromName})</td>`);
        
        // Colunas de conversão para cada planeta
        Object.keys(economicSystem.baseRates[fromPlanet]).forEach(toPlanet => {
            const baseRate = economicSystem.baseRates[fromPlanet][toPlanet];
            const variation = economicSystem.currentVariations[toPlanet];
            const adjustedRate = Math.round(baseRate * (1 + variation / 100));
            
            let cellClass = 'border border-gray-300 px-3 py-2 text-center';
            let textClass = '';
            
            if (fromPlanet === toPlanet) {
                textClass = 'font-semibold text-esmeralda';
            } else if (variation > 0) {
                textClass = 'text-green-600';
            } else if (variation < 0) {
                textClass = 'text-red-600';
            }
            
            row.append(`<td class="${cellClass}"><span class="${textClass}">${adjustedRate}</span></td>`);
        });
        
        tbody.append(row);
    });
}

function updateHistoryTable() {
    const tbody = $('#history-table-body');
    tbody.empty();
    
    economicSystem.history.forEach(entry => {
        const row = $('<tr></tr>');
        
        row.append(`<td class="text-left py-1 text-gray-700">${entry.time}</td>`);
        
        Object.keys(economicSystem.planets).forEach(planetCode => {
            const variation = entry.variations[planetCode];
            const sign = variation >= 0 ? '+' : '';
            let textClass = 'text-gray-600';
            
            if (variation > 0) {
                textClass = 'text-green-600';
            } else if (variation < 0) {
                textClass = 'text-red-600';
            }
            
            row.append(`<td class="text-center py-1 ${textClass}">${sign}${variation.toFixed(1)}%</td>`);
        });
        
        tbody.append(row);
    });
}

function updateModifier(attributeName) {
    const value = parseInt($(`#${attributeName}`).val()) || 10;
    const modifier = Math.floor((value - 10) / 2);
    const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
    
    $(`#${attributeName}-mod`).text(modifierText);
    
    // Efeito visual baseado no valor
    const $attributeBox = $(`#${attributeName}`).closest('.attribute-box');
    $attributeBox.removeClass('high-stat low-stat');
    
    if (value >= 16) {
        $attributeBox.addClass('high-stat');
    } else if (value <= 8) {
        $attributeBox.addClass('low-stat');
    }
    
    return modifier;
}

function updateAllModifiers() {
    const attributes = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    attributes.forEach(attr => updateModifier(attr));
}

function updateDependentStats() {
    updateSavingThrows();
    updateSkills();
    updateInitiative();
}

function updateSavingThrows() {
    const profBonus = parseInt($('#proficiency').val()) || 2;
    const saves = {
        'str-save': { attribute: 'strength', checkbox: '#str-save-prof' },
        'dex-save': { attribute: 'dexterity', checkbox: '#dex-save-prof' },
        'con-save': { attribute: 'constitution', checkbox: '#con-save-prof' },
        'int-save': { attribute: 'intelligence', checkbox: '#int-save-prof' },
        'wis-save': { attribute: 'wisdom', checkbox: '#wis-save-prof' },
        'cha-save': { attribute: 'charisma', checkbox: '#cha-save-prof' }
    };
    
    Object.keys(saves).forEach(saveId => {
        const save = saves[saveId];
        const modifier = updateModifier(save.attribute);
        const isProficient = $(save.checkbox).is(':checked');
        const bonus = modifier + (isProficient ? profBonus : 0);
        const bonusText = bonus >= 0 ? `+${bonus}` : `${bonus}`;
        
        $(`#${saveId}`).text(bonusText);
    });
}

function updateSkills() {
    const profBonus = parseInt($('#proficiency').val()) || 2;
    const skillMap = {
        'acrobatics': 'dexterity',
        'animal-handling': 'wisdom',
        'arcana': 'intelligence',
        'athletics': 'strength',
        'deception': 'charisma',
        'history': 'intelligence',
        'insight': 'wisdom',
        'intimidation': 'charisma',
        'investigation': 'intelligence',
        'medicine': 'wisdom',
        'nature': 'intelligence',
        'perception': 'wisdom',
        'performance': 'charisma',
        'persuasion': 'charisma',
        'religion': 'intelligence',
        'sleight-of-hand': 'dexterity',
        'stealth': 'dexterity',
        'survival': 'wisdom',
        'technology': 'intelligence',
        'computing': 'intelligence'
    };
    
    Object.keys(skillMap).forEach(skill => {
        const attribute = skillMap[skill];
        const modifier = updateModifier(attribute);
        const isProficient = $(`.skill-item input[data-skill="${skill}"]`).is(':checked');
        const bonus = modifier + (isProficient ? profBonus : 0);
        const bonusText = bonus >= 0 ? `+${bonus}` : `${bonus}`;
        
        $(`#${skill}`).text(bonusText);
    });
}

function updateInitiative() {
    const dexModifier = updateModifier('dexterity');
    $('#initiative').val(dexModifier);
}

// === POINT BUY SYSTEM ===
let pointBuyActive = true;
let remainingPoints = 27;
const baseAttributeValue = 8;
const attributeCosts = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

function initializePointBuy() {
    // Definir todos os atributos para 8 se Point Buy estiver ativo
    if ($('#point-buy-toggle').prop('checked')) {
        const attributes = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        attributes.forEach(attr => {
            $(`#${attr}`).val(baseAttributeValue);
        });
        updatePointBuyDisplay();
        updateAllModifiers();
    }
}

function togglePointBuy() {
    pointBuyActive = $('#point-buy-toggle').prop('checked');
    const $pointBuyInfo = $('#point-buy-info');
    
    if (pointBuyActive) {
        $pointBuyInfo.show();
        // Resetar para valores base
        const attributes = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        attributes.forEach(attr => {
            $(`#${attr}`).val(baseAttributeValue);
        });
        remainingPoints = 27;
        updatePointBuyDisplay();
        updateAllModifiers();
    } else {
        $pointBuyInfo.hide();
    }
}

function handlePointBuyChange(attributeName) {
    if (!pointBuyActive) return;
    
    const newValue = parseInt($(`#${attributeName}`).val()) || baseAttributeValue;
    const oldValue = getOldAttributeValue(attributeName);
    
    // Verificar se o valor está no range válido
    if (newValue < 8 || newValue > 15) {
        $(`#${attributeName}`).val(oldValue);
        return;
    }
    
    // Calcular mudança nos pontos
    const oldCost = attributeCosts[oldValue] || 0;
    const newCost = attributeCosts[newValue] || 0;
    const pointChange = newCost - oldCost;
    
    // Verificar se temos pontos suficientes
    if (remainingPoints - pointChange < 0) {
        $(`#${attributeName}`).val(oldValue);
        showNotification('Pontos insuficientes!', 'error');
        return;
    }
    
    // Aplicar mudança
    remainingPoints -= pointChange;
    updatePointBuyDisplay();
    updateModifier(attributeName);
    updateDependentStats();
    
    // Salvar valor atual para próxima comparação
    $(`#${attributeName}`).data('oldValue', newValue);
}

function getOldAttributeValue(attributeName) {
    return $(`#${attributeName}`).data('oldValue') || baseAttributeValue;
}

function updatePointBuyDisplay() {
    $('#points-remaining').text(remainingPoints);
    const $pointsDisplay = $('#points-remaining');
    
    $pointsDisplay.removeClass('text-roxo text-red-500 text-yellow-500');
    
    if (remainingPoints === 0) {
        $pointsDisplay.addClass('text-esmeralda');
    } else if (remainingPoints < 5) {
        $pointsDisplay.addClass('text-yellow-500');
    } else {
        $pointsDisplay.addClass('text-roxo');
    }
}

function updateBlightIndicator() {
    const value = $('#blight-slider').val();
    const percentage = parseInt(value);
    
    $('#blight-fill').css('width', `${percentage}%`);
    $('#blight-percentage').text(`${percentage}%`);
    
    const $indicator = $('.blight-indicator');
    $indicator.removeClass('blight-low blight-medium blight-high blight-critical');
    
    if (percentage <= 25) {
        $indicator.addClass('blight-low');
    } else if (percentage <= 50) {
        $indicator.addClass('blight-medium');
    } else if (percentage <= 75) {
        $indicator.addClass('blight-high');
    } else {
        $indicator.addClass('blight-critical');
    }
}

function updateRejectionLevel() {
    const value = $('#rejection-slider').val();
    const percentage = parseInt(value);
    
    $('#rejection-fill').css('width', `${percentage}%`);
    $('#rejection-percentage').text(`${percentage}%`);
    
    const $fill = $('#rejection-fill');
    const $percentage = $('#rejection-percentage');
    const $container = $fill.parent(); // Container da barra
    
    // Remover todas as classes anteriores
    $fill.removeClass('rejection-gradient-low rejection-gradient-medium rejection-gradient-high rejection-gradient-critical rejection-blink');
    $percentage.removeClass('text-green-500 text-yellow-500 text-orange-500 text-red-500');
    $container.removeClass('rejection-blink');
    
    // Aplicar estilos únicos para rejeição
    if (percentage <= 25) {
        $fill.addClass('rejection-gradient-low');
        $percentage.addClass('text-green-500');
    } else if (percentage <= 50) {
        $fill.addClass('rejection-gradient-medium');
        $percentage.addClass('text-yellow-500');
    } else if (percentage <= 75) {
        $fill.addClass('rejection-gradient-high');
        $percentage.addClass('text-orange-500');
    } else {
        $fill.addClass('rejection-gradient-critical');
        $percentage.addClass('text-red-500');
    }
    
    // Efeito de piscar quando >= 90%
    if (percentage >= 90) {
        $fill.addClass('rejection-blink');
        $container.addClass('rejection-blink');
    }
}

function updateNeuralOverload() {
    const value = $('#neural-overload-slider').val();
    const percentage = parseInt(value);
    
    $('#neural-overload-fill').css('width', `${percentage}%`);
    $('#neural-overload-percentage').text(`${percentage}%`);
    
    const $fill = $('#neural-overload-fill');
    const $percentage = $('#neural-overload-percentage');
    const $container = $fill.parent(); // Container da barra
    
    // Remover todas as classes anteriores
    $fill.removeClass('neural-gradient-low neural-gradient-medium neural-gradient-high neural-gradient-critical neural-blink');
    $percentage.removeClass('text-cyan-500 text-blue-500 text-purple-500 text-red-500');
    $container.removeClass('neural-blink');
    
    // Aplicar estilos únicos para neural (tons de azul/cyan/roxo)
    if (percentage <= 25) {
        $fill.addClass('neural-gradient-low');
        $percentage.addClass('text-cyan-500');
    } else if (percentage <= 50) {
        $fill.addClass('neural-gradient-medium');
        $percentage.addClass('text-blue-500');
    } else if (percentage <= 75) {
        $fill.addClass('neural-gradient-high');
        $percentage.addClass('text-purple-500');
    } else {
        $fill.addClass('neural-gradient-critical');
        $percentage.addClass('text-red-500');
    }
    
    // Efeito de piscar quando >= 90%
    if (percentage >= 90) {
        $fill.addClass('neural-blink');
        $container.addClass('neural-blink');
    }
}

function updateCharacterPhoto() {
    const photoUrl = $('#character-photo-url').val().trim();
    const $photo = $('#character-photo');
    const $placeholder = $('#photo-placeholder');
    
    if (photoUrl && isValidUrl(photoUrl)) {
        // Testar se a URL é válida carregando a imagem
        const testImg = new Image();
        testImg.onload = function() {
            $photo.attr('src', photoUrl).removeClass('hidden');
            $placeholder.addClass('hidden');
        };
        testImg.onerror = function() {
            // Se a imagem não carregar, mostrar placeholder
            $photo.addClass('hidden');
            $placeholder.removeClass('hidden');
        };
        testImg.src = photoUrl;
    } else {
        // URL vazia ou inválida, mostrar placeholder
        $photo.addClass('hidden');
        $placeholder.removeClass('hidden');
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function setupHPTracking() {
    $('#current-hp, #max-hp').on('input', function() {
        const current = parseInt($('#current-hp').val()) || 0;
        const max = parseInt($('#max-hp').val()) || 1;
        const percentage = (current / max) * 100;
        
        const $currentHp = $('#current-hp');
        $currentHp.removeClass('hp-critical hp-warning hp-healthy');
        
        if (percentage <= 25) {
            $currentHp.addClass('hp-critical');
        } else if (percentage <= 50) {
            $currentHp.addClass('hp-warning');
        } else {
            $currentHp.addClass('hp-healthy');
        }
    });
}

function setupDiceModal() {
    const $modal = $('#dice-modal');
    const $closeBtn = $('.close');
    
    // Fechar modal
    $closeBtn.on('click', function() {
        $modal.hide();
    });
    
    $(window).on('click', function(event) {
        if (event.target === $modal[0]) {
            $modal.hide();
        }
    });
    
    // Rolar dados
    $('#roll-dice').on('click', function() {
        rollDice();
    });
    
    // Enter para rolar
    $('#dice-type, #dice-count, #dice-modifier').on('keypress', function(e) {
        if (e.which === 13) {
            rollDice();
        }
    });
}

function openDiceModal() {
    $('#dice-modal').show();
    $('#dice-result').html('<div style="color: var(--cinza-grafite);">Configure os dados e clique em ROLAR</div>');
}

function rollDice() {
    const diceType = $('#dice-type').val();
    const diceCount = parseInt($('#dice-count').val()) || 1;
    const modifier = parseInt($('#dice-modifier').val()) || 0;
    
    const sides = parseInt(diceType.substring(1));
    let total = 0;
    let rolls = [];
    
    for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
    }
    
    total += modifier;
    
    let resultHTML = `
        <div style="margin-bottom: 10px;">
            <strong style="color: var(--azul-eletrico); font-size: 2rem;">${total}</strong>
        </div>
        <div style="color: var(--prata-metalico); font-size: 0.9rem;">
            ${diceCount}${diceType}: [${rolls.join(', ')}]
        </div>
    `;
    
    if (modifier !== 0) {
        resultHTML += `<div style="color: var(--cinza-grafite); font-size: 0.8rem;">
            Modificador: ${modifier >= 0 ? '+' : ''}${modifier}
        </div>`;
    }
    
    $('#dice-result').html(resultHTML);
    
    // Efeito visual
    $('#dice-result').css('transform', 'scale(0.8)').animate({
        transform: 'scale(1)'
    }, 300);
}

function addNewAttack() {
    const newAttackRow = `
        <div class="attack-row">
            <input type="text" placeholder="Nome do ataque">
            <input type="text" placeholder="+5">
            <input type="text" placeholder="1d8+3 cortante">
        </div>
    `;
    
    $('.attacks-list').append(newAttackRow);
    
    // Efeito visual
    $('.attack-row').last().hide().fadeIn(300);
}

function collectGeneticModifications() {
    const modifications = [];
    $('.genetic-mod').each(function() {
        const mod = {
            name: $(this).find('.genetic-name').val(),
            minPercent: parseInt($(this).find('.genetic-min').val()) || 0,
            maxPercent: parseInt($(this).find('.genetic-max').val()) || 100,
            description: $(this).find('.genetic-description').val(),
            active: $(this).find('.genetic-active').is(':checked'),
            id: $(this).attr('data-id')
        };
        if (mod.name) {
            modifications.push(mod);
        }
    });
    return modifications;
}

function collectMechanicalImplants() {
    const implants = [];
    $('.mechanical-implant').each(function() {
        const implant = {
            name: $(this).find('.implant-name').val(),
            minPercent: parseInt($(this).find('.implant-min').val()) || 0,
            maxPercent: parseInt($(this).find('.implant-max').val()) || 100,
            description: $(this).find('.implant-description').val(),
            active: $(this).find('.implant-active').is(':checked'),
            id: $(this).attr('data-id')
        };
        if (implant.name) {
            implants.push(implant);
        }
    });
    return implants;
}

async function saveCharacterData() {
    const characterData = {
        // Informações básicas
        name: $('#character-name').val(),
        photoUrl: $('#character-photo-url').val(),
        classLevel: $('#class-level').val(),
        background: $('#background').val(),
        race: $('#race').val(),
        alignment: $('#alignment').val(),
        experience: $('#experience').val(),
        
        // Atributos
        strength: $('#strength').val(),
        dexterity: $('#dexterity').val(),
        constitution: $('#constitution').val(),
        intelligence: $('#intelligence').val(),
        wisdom: $('#wisdom').val(),
        charisma: $('#charisma').val(),
        
        // Competências
        inspiration: $('#inspiration').is(':checked'),
        proficiency: $('#proficiency').val(),
        
        // Testes de resistência
        savingThrows: {
            strength: $('#str-save-prof').is(':checked'),
            dexterity: $('#dex-save-prof').is(':checked'),
            constitution: $('#con-save-prof').is(':checked'),
            intelligence: $('#int-save-prof').is(':checked'),
            wisdom: $('#wis-save-prof').is(':checked'),
            charisma: $('#cha-save-prof').is(':checked')
        },
        
        // Perícias
        skills: {},
        
        // Combat stats
        armorClass: $('#armor-class').val(),
        initiative: $('#initiative').val(),
        speed: $('#speed').val(),
        maxHp: $('#max-hp').val(),
        currentHp: $('#current-hp').val(),
        tempHp: $('#temp-hp').val(),
        hitDiceTotal: $('#hit-dice-total').val(),
        hitDiceUsed: $('#hit-dice-used').val(),
        
        // Death saves
        deathSaves: {
            successes: $('.death-save.success:checked').length,
            failures: $('.death-save.failure:checked').length
        },
        
        // Equipamentos
        equipment: $('#equipment').val(),
        money: {
            copper: $('#copper').val(),
            silver: $('#silver').val(),
            electrum: $('#electrum').val(),
            gold: $('#gold').val(),
            platinum: $('#platinum').val()
        },
        
        // Traços
        personalityTraits: $('#personality-traits').val(),
        ideals: $('#ideals').val(),
        bonds: $('#bonds').val(),
        flaws: $('#flaws').val(),
        features: $('#features').val(),
        
        // Aprimoramentos
        geneticModifications: collectGeneticModifications(),
        geneticSideEffects: $('#genetic-side-effects').val(),
        rejectionLevel: $('#rejection-slider').val(),
        mechanicalImplants: collectMechanicalImplants(),
        maintenanceNeeds: $('#maintenance-needs').val(),
        neuralOverload: $('#neural-overload-slider').val(),
        
        // Status
        blightLevel: $('#blight-slider').val(),
        
        // Point Buy
        pointBuyActive: $('#point-buy-toggle').is(':checked'),
        remainingPoints: remainingPoints,
        
        // Timestamp
        lastSaved: new Date().toISOString()
    };
    
    // Salvar perícias
    $('.skill-item input[type="checkbox"]').each(function() {
        const skill = $(this).attr('data-skill');
        if (skill) {
            characterData.skills[skill] = $(this).is(':checked');
        }
    });
    
    // Salvar ataques
    characterData.attacks = [];
    $('.attack-row:not(.header)').each(function() {
        const inputs = $(this).find('input');
        if (inputs.length === 3) {
            characterData.attacks.push({
                name: $(inputs[0]).val(),
                bonus: $(inputs[1]).val(),
                damage: $(inputs[2]).val()
            });
        }
    });
    
    // Salvar dados de magias
    characterData.spellData = includeSpellsInSave();
    
    // Verificar se o nome foi preenchido
    if (!characterData.name || characterData.name.trim() === '') {
        showNotification('Por favor, preencha o nome do personagem antes de salvar!', 'error');
        $('#character-name').focus();
        return;
    }
    
    // Mostrar loading
    $('.save-btn').text('Salvando...').prop('disabled', true);
    
    try {
        // Salvar no Firebase
        if (typeof FirebaseUtils !== 'undefined') {
            const result = await FirebaseUtils.saveCharacter(characterData);
            
            if (result.success) {
                // Sucesso - mostrar link do personagem
                showNotification(`✅ Ficha salva manualmente com sucesso! 
                    <br><a href="${result.url}" target="_blank" class="text-blue-600 hover:underline">Ver ficha online</a>`, 'success');
                
                // Copiar URL para clipboard
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(result.url);
                    setTimeout(() => {
                        showNotification('Link da ficha copiado para área de transferência!', 'info');
                    }, 2000);
                }
            } else {
                // Erro no Firebase, mas salvar localmente
                localStorage.setItem('dndCharacterSheet', JSON.stringify(characterData));
                showNotification('Erro ao salvar online: ' + result.message + '<br>Salvo localmente como backup.', 'warning');
            }
        } else {
            // Firebase não disponível, salvar apenas localmente
            localStorage.setItem('dndCharacterSheet', JSON.stringify(characterData));
            showNotification('✅ Ficha salva localmente (Firebase não disponível)', 'warning');
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
        // Fallback para localStorage
        localStorage.setItem('dndCharacterSheet', JSON.stringify(characterData));
        showNotification('⚠️ Erro ao salvar online. Salvo localmente como backup.', 'warning');
    } finally {
        // Restaurar botão
        $('.save-btn').text('SALVAR FICHA').prop('disabled', false);
    }
}

function loadGeneticModifications(modifications) {
    // Limpar modificações existentes
    $('#genetic-modifications-list').empty();
    
    // Carregar modificações salvas
    if (Array.isArray(modifications)) {
        modifications.forEach(mod => {
            const modHtml = `
                <div class="genetic-mod border border-gray-300 rounded p-3 bg-gray-50" data-id="${mod.id || 'genetic-mod-' + Date.now()}">
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
                        <input type="text" placeholder="Nome da modificação" class="genetic-name border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-eletrico" value="${mod.name || ''}">
                        <input type="number" placeholder="Min %" class="genetic-min border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-eletrico" min="0" max="100" value="${mod.minPercent || 0}">
                        <input type="number" placeholder="Max %" class="genetic-max border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-eletrico" min="0" max="100" value="${mod.maxPercent || 100}">
                        <div class="flex items-center justify-center">
                            <label class="flex items-center gap-2 text-sm">
                                <input type="checkbox" class="genetic-active w-4 h-4 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500" ${mod.active ? 'checked' : ''}>
                                <span class="text-gray-700">Ativo</span>
                            </label>
                        </div>
                        <button class="remove-genetic bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600">Remover</button>
                    </div>
                    <textarea placeholder="Descrição dos efeitos..." class="genetic-description w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:border-eletrico" rows="2">${mod.description || ''}</textarea>
                </div>
            `;
            
            $('#genetic-modifications-list').append(modHtml);
        });
    }
    
    // Reconfigurar event listeners
    $('.genetic-mod .genetic-min, .genetic-mod .genetic-max').on('input', function() {
        updateRejectionMinimum();
        updateGeneticActiveEffects();
    });
    $('.genetic-mod .genetic-active').on('change', function() {
        updateGeneticActiveEffects();
    });
    $('.genetic-mod .remove-genetic').on('click', function() {
        $(this).closest('.genetic-mod').remove();
        updateRejectionMinimum();
        updateGeneticActiveEffects();
    });
    
    updateRejectionMinimum();
    updateGeneticActiveEffects();
}

function loadMechanicalImplants(implants) {
    // Limpar implantes existentes
    $('#mechanical-implants-list').empty();
    
    // Carregar implantes salvos
    if (Array.isArray(implants)) {
        implants.forEach(implant => {
            const implantHtml = `
                <div class="mechanical-implant border border-gray-300 rounded p-3 bg-gray-50" data-id="${implant.id || 'mechanical-implant-' + Date.now()}">
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
                        <input type="text" placeholder="Nome do implante" class="implant-name border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-eletrico" value="${implant.name || ''}">
                        <input type="number" placeholder="Min %" class="implant-min border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-eletrico" min="0" max="100" value="${implant.minPercent || 0}">
                        <input type="number" placeholder="Max %" class="implant-max border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-eletrico" min="0" max="100" value="${implant.maxPercent || 100}">
                        <div class="flex items-center justify-center">
                            <label class="flex items-center gap-2 text-sm">
                                <input type="checkbox" class="implant-active w-4 h-4 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500" ${implant.active ? 'checked' : ''}>
                                <span class="text-gray-700">Ativo</span>
                            </label>
                        </div>
                        <button class="remove-implant bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600">Remover</button>
                    </div>
                    <textarea placeholder="Descrição dos efeitos..." class="implant-description w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:border-eletrico" rows="2">${implant.description || ''}</textarea>
                </div>
            `;
            
            $('#mechanical-implants-list').append(implantHtml);
        });
    }
    
    // Reconfigurar event listeners
    $('.mechanical-implant .implant-min, .mechanical-implant .implant-max').on('input', function() {
        updateNeuralMinimum();
        updateMechanicalActiveEffects();
    });
    $('.mechanical-implant .implant-active').on('change', function() {
        updateMechanicalActiveEffects();
    });
    $('.mechanical-implant .remove-implant').on('click', function() {
        $(this).closest('.mechanical-implant').remove();
        updateNeuralMinimum();
        updateMechanicalActiveEffects();
    });
    
    updateNeuralMinimum();
    updateMechanicalActiveEffects();
}

function loadCharacterData() {
    const savedData = localStorage.getItem('dndCharacterSheet');
    if (!savedData) return;
    
    try {
        const characterData = JSON.parse(savedData);
        
        // Carregar informações básicas
        $('#character-name').val(characterData.name || '');
        $('#character-photo-url').val(characterData.photoUrl || '');
        $('#class-level').val(characterData.classLevel || '');
        $('#background').val(characterData.background || '');
        $('#race').val(characterData.race || '');
        $('#alignment').val(characterData.alignment || '');
        $('#experience').val(characterData.experience || '');
        
        // Carregar atributos
        $('#strength').val(characterData.strength || 10);
        $('#dexterity').val(characterData.dexterity || 10);
        $('#constitution').val(characterData.constitution || 10);
        $('#intelligence').val(characterData.intelligence || 10);
        $('#wisdom').val(characterData.wisdom || 10);
        $('#charisma').val(characterData.charisma || 10);
        
        // Carregar competências
        $('#inspiration').prop('checked', characterData.inspiration || false);
        $('#proficiency').val(characterData.proficiency || 2);
        
        // Carregar testes de resistência
        if (characterData.savingThrows) {
            $('#str-save-prof').prop('checked', characterData.savingThrows.strength || false);
            $('#dex-save-prof').prop('checked', characterData.savingThrows.dexterity || false);
            $('#con-save-prof').prop('checked', characterData.savingThrows.constitution || false);
            $('#int-save-prof').prop('checked', characterData.savingThrows.intelligence || false);
            $('#wis-save-prof').prop('checked', characterData.savingThrows.wisdom || false);
            $('#cha-save-prof').prop('checked', characterData.savingThrows.charisma || false);
        }
        
        // Carregar perícias
        if (characterData.skills) {
            Object.keys(characterData.skills).forEach(skill => {
                $(`.skill-item input[data-skill="${skill}"]`).prop('checked', characterData.skills[skill]);
            });
        }
        
        // Carregar stats de combate
        $('#armor-class').val(characterData.armorClass || 10);
        $('#speed').val(characterData.speed || '30 pés');
        $('#max-hp').val(characterData.maxHp || '');
        $('#current-hp').val(characterData.currentHp || '');
        $('#temp-hp').val(characterData.tempHp || '');
        $('#hit-dice-total').val(characterData.hitDiceTotal || '');
        $('#hit-dice-used').val(characterData.hitDiceUsed || '');
        
        // Carregar equipamentos
        $('#equipment').val(characterData.equipment || '');
        if (characterData.money) {
            $('#copper').val(characterData.money.copper || 0);
            $('#silver').val(characterData.money.silver || 0);
            $('#electrum').val(characterData.money.electrum || 0);
            $('#gold').val(characterData.money.gold || 0);
            $('#platinum').val(characterData.money.platinum || 0);
        }
        
        // Carregar traços
        $('#personality-traits').val(characterData.personalityTraits || '');
        $('#ideals').val(characterData.ideals || '');
        $('#bonds').val(characterData.bonds || '');
        $('#flaws').val(characterData.flaws || '');
        $('#features').val(characterData.features || '');
        
        // Carregar aprimoramentos
        loadGeneticModifications(characterData.geneticModifications || []);
        $('#genetic-side-effects').val(characterData.geneticSideEffects || '');
        $('#rejection-slider').val(characterData.rejectionLevel || 0);
        loadMechanicalImplants(characterData.mechanicalImplants || []);
        $('#maintenance-needs').val(characterData.maintenanceNeeds || '');
        $('#neural-overload-slider').val(characterData.neuralOverload || 0);
        
        // Carregar status
        $('#blight-slider').val(characterData.blightLevel || 0);
        
        // Carregar Point Buy
        if (characterData.pointBuyActive !== undefined) {
            $('#point-buy-toggle').prop('checked', characterData.pointBuyActive);
            pointBuyActive = characterData.pointBuyActive;
            if (characterData.remainingPoints !== undefined) {
                remainingPoints = characterData.remainingPoints;
            }
            togglePointBuy();
        }
        
        // Carregar ataques
        if (characterData.attacks && characterData.attacks.length > 0) {
            // Limpar ataques existentes (exceto header)
            $('.attack-row:not(.header)').remove();
            
            characterData.attacks.forEach(attack => {
                const attackRow = `
                    <div class="attack-row">
                        <input type="text" value="${attack.name || ''}" placeholder="Nome do ataque">
                        <input type="text" value="${attack.bonus || ''}" placeholder="+5">
                        <input type="text" value="${attack.damage || ''}" placeholder="1d8+3 cortante">
                    </div>
                `;
                $('.attacks-list').append(attackRow);
            });
        }
        
        // Carregar dados de magias
        if (characterData.spellData) {
            loadSpellData(characterData.spellData);
        }
        
        // Recalcular tudo
        updateAllModifiers();
        updateDependentStats();
        updateBlightIndicator();
        updateRejectionLevel();
        updateNeuralOverload();
        updateCharacterPhoto();
        
        showNotification('Ficha carregada com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao carregar a ficha!', 'error');
        console.error('Erro ao carregar dados:', error);
    }
}

function loadCharacterDataFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const characterData = JSON.parse(e.target.result);
                localStorage.setItem('dndCharacterSheet', JSON.stringify(characterData));
                loadCharacterData();
            } catch (error) {
                showNotification('Arquivo inválido!', 'error');
                console.error('Erro ao ler arquivo:', error);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function resetCharacterSheet() {
    if (confirm('Tem certeza que deseja resetar toda a ficha? Esta ação não pode ser desfeita.')) {
        localStorage.removeItem('dndCharacterSheet');
        location.reload();
    }
}

function showNotification(message, type = 'info') {
    const notification = $(`
        <div class="notification ${type}">
            ${message}
        </div>
    `);
    
    $('body').append(notification);
    
    // Mostrar notificação
    setTimeout(() => {
        notification.addClass('show');
    }, 100);
    
    // Remover notificação
    setTimeout(() => {
        notification.removeClass('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function addVisualEffects() {
    // Efeito de hover nos atributos
    $('.attribute-box').hover(
        function() {
            $(this).css('transform', 'translateY(-5px) scale(1.05)');
        },
        function() {
            $(this).css('transform', 'translateY(0) scale(1)');
        }
    );
    
    // Efeito de foco nos inputs
    $('input, select, textarea').focus(function() {
        $(this).parent().addClass('focused');
    }).blur(function() {
        $(this).parent().removeClass('focused');
    });
}

// Funcionalidades da Lista de Personagens
function setupCharactersListModal() {
    // Fechar modal ao clicar no X ou fora dele
    $('#characters-list-modal .close, #characters-list-modal').on('click', function(e) {
        if (e.target === this) {
            $('#characters-list-modal').fadeOut(300);
        }
    });
    
    // Prevenir fechamento ao clicar no conteúdo
    $('#characters-list-modal .modal-content').on('click', function(e) {
        e.stopPropagation();
    });
}

async function openCharactersListModal() {
    $('#characters-list-modal').fadeIn(300);
    await loadCharactersList();
}

async function loadCharactersList() {
    $('#characters-loading').show();
    $('#characters-list').hide();
    $('#no-characters').hide();
    
    try {
        if (typeof FirebaseUtils !== 'undefined') {
            const result = await FirebaseUtils.listCharacters();
            
            if (result.success) {
                if (result.data.length > 0) {
                    displayCharactersList(result.data);
                } else {
                    $('#no-characters').show();
                }
            } else {
                showNotification('Erro ao carregar lista de personagens: ' + result.message, 'error');
                $('#no-characters').show();
            }
        } else {
            // Fallback para localStorage se Firebase não estiver disponível
            const localData = localStorage.getItem('dndCharacterSheet');
            if (localData) {
                const character = JSON.parse(localData);
                displayCharactersList([{
                    key: 'local',
                    name: character.name || 'Personagem Local',
                    classLevel: character.classLevel || '',
                    lastUpdated: Date.now(),
                    url: '#',
                    isLocal: true
                }]);
            } else {
                $('#no-characters').show();
            }
        }
    } catch (error) {
        console.error('Erro ao carregar personagens:', error);
        showNotification('Erro ao carregar personagens', 'error');
        $('#no-characters').show();
    } finally {
        $('#characters-loading').hide();
    }
}

function displayCharactersList(characters) {
    const charactersHtml = characters.map(character => {
        const lastUpdated = character.lastUpdated ? 
            new Date(character.lastUpdated).toLocaleString('pt-BR') : 
            'Desconhecido';
            
        return `
            <div class="character-item bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-eletrico transition-colors mb-3">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-800 mb-1">${character.name}</h3>
                        <p class="text-sm text-gray-600 mb-2">${character.classLevel || 'Classe não definida'}</p>
                        <p class="text-xs text-gray-500">Última atualização: ${lastUpdated}</p>
                    </div>
                    <div class="flex gap-2 ml-4">
                        ${character.isLocal ? 
                            `<button class="bg-eletrico text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors load-local-character">
                                Carregar
                            </button>` :
                            `<button class="bg-eletrico text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors load-character" data-key="${character.key}">
                                Carregar
                            </button>`
                        }
                        <button class="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors copy-link" data-url="${character.url}">
                            📋
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    $('#characters-list').html(charactersHtml).show();
    
    // Event listeners para os botões
    $('.load-character').on('click', function() {
        const characterKey = $(this).attr('data-key');
        loadCharacterFromFirebase(characterKey);
    });
    
    $('.load-local-character').on('click', function() {
        loadCharacterData();
        $('#characters-list-modal').fadeOut(300);
        showNotification('Personagem local carregado!', 'success');
    });
    
    $('.copy-link').on('click', function() {
        const url = $(this).attr('data-url');
        if (url && url !== '#') {
            navigator.clipboard.writeText(url).then(() => {
                showNotification('Link copiado!', 'success');
            });
        }
    });
}

async function loadCharacterFromFirebase(characterKey) {
    try {
        if (typeof FirebaseUtils !== 'undefined') {
            const result = await FirebaseUtils.loadCharacter(characterKey);
            
            if (result.success) {
                loadCharacterFromData(result.data);
                $('#characters-list-modal').fadeOut(300);
                showNotification('Personagem carregado com sucesso!', 'success');
            } else {
                showNotification('Erro ao carregar personagem: ' + result.message, 'error');
            }
        } else {
            showNotification('Firebase não disponível', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar personagem:', error);
        showNotification('Erro ao carregar personagem', 'error');
    }
}

function loadCharacterFromData(characterData) {
    // Carregar informações básicas
    $('#character-name').val(characterData.name || '');
    $('#character-photo-url').val(characterData.photoUrl || '');
    $('#class-level').val(characterData.classLevel || '');
    $('#background').val(characterData.background || '');
    $('#race').val(characterData.race || '');
    $('#alignment').val(characterData.alignment || '');
    $('#experience').val(characterData.experience || '');
    
    // Carregar atributos
    $('#strength').val(characterData.strength || 10);
    $('#dexterity').val(characterData.dexterity || 10);
    $('#constitution').val(characterData.constitution || 10);
    $('#intelligence').val(characterData.intelligence || 10);
    $('#wisdom').val(characterData.wisdom || 10);
    $('#charisma').val(characterData.charisma || 10);
    
    // Carregar competências
    $('#inspiration').prop('checked', characterData.inspiration || false);
    $('#proficiency').val(characterData.proficiency || 2);
    
    // Carregar testes de resistência
    if (characterData.savingThrows) {
        $('#str-save-prof').prop('checked', characterData.savingThrows.strength || false);
        $('#dex-save-prof').prop('checked', characterData.savingThrows.dexterity || false);
        $('#con-save-prof').prop('checked', characterData.savingThrows.constitution || false);
        $('#int-save-prof').prop('checked', characterData.savingThrows.intelligence || false);
        $('#wis-save-prof').prop('checked', characterData.savingThrows.wisdom || false);
        $('#cha-save-prof').prop('checked', characterData.savingThrows.charisma || false);
    }
    
    // Carregar perícias
    if (characterData.skills) {
        Object.keys(characterData.skills).forEach(skill => {
            $(`input[data-skill="${skill}"]`).prop('checked', characterData.skills[skill]);
        });
    }
    
    // Carregar stats de combate
    $('#armor-class').val(characterData.armorClass || 10);
    $('#initiative').val(characterData.initiative || 0);
    $('#speed').val(characterData.speed || '30 pés');
    $('#max-hp').val(characterData.maxHp || '');
    $('#current-hp').val(characterData.currentHp || '');
    $('#temp-hp').val(characterData.tempHp || '');
    $('#hit-dice-total').val(characterData.hitDiceTotal || '');
    $('#hit-dice-used').val(characterData.hitDiceUsed || '');
    
    // Carregar equipamentos
    $('#equipment').val(characterData.equipment || '');
    if (characterData.money) {
        $('#copper').val(characterData.money.copper || 0);
        $('#silver').val(characterData.money.silver || 0);
        $('#electrum').val(characterData.money.electrum || 0);
        $('#gold').val(characterData.money.gold || 0);
        $('#platinum').val(characterData.money.platinum || 0);
    }
    
    // Carregar traços
    $('#personality-traits').val(characterData.personalityTraits || '');
    $('#ideals').val(characterData.ideals || '');
    $('#bonds').val(characterData.bonds || '');
    $('#flaws').val(characterData.flaws || '');
    $('#features').val(characterData.features || '');
    
    // Carregar aprimoramentos
    if (characterData.geneticModifications) {
        loadGeneticModifications(characterData.geneticModifications);
    }
    $('#genetic-side-effects').val(characterData.geneticSideEffects || '');
    $('#rejection-slider').val(characterData.rejectionLevel || 0);
    
    if (characterData.mechanicalImplants) {
        loadMechanicalImplants(characterData.mechanicalImplants);
    }
    $('#maintenance-needs').val(characterData.maintenanceNeeds || '');
    $('#neural-overload-slider').val(characterData.neuralOverload || 0);
    
    // Carregar status
    $('#blight-slider').val(characterData.blightLevel || 0);
    
    // Carregar Point Buy
    if (characterData.pointBuyActive !== undefined) {
        $('#point-buy-toggle').prop('checked', characterData.pointBuyActive);
        togglePointBuy();
    }
    
    // Atualizar foto
    updateCharacterPhoto();
    
    // Atualizar todos os cálculos
    updateAllModifiers();
    updateDependentStats();
    updateBlightIndicator();
    updateRejectionLevel();
    updateNeuralOverload();
}

// Configuração do Debug do Firebase
function setupFirebaseDebug() {
    // Mostrar debug se estiver em localhost ou com parâmetro debug
    const isDebugMode = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.search.includes('debug=true');
    
    if (isDebugMode) {
        console.log('🔧 Modo debug ativado!');
        $('#firebase-debug').removeClass('hidden');
        
        // Event listener para o botão de teste
        $('#test-firebase-btn').on('click', async function() {
            const button = $(this);
            const originalText = button.text();
            
            button.text('🔄 Testando...').prop('disabled', true);
            $('#firebase-status-text').text('Executando testes...');
            
            try {
                if (typeof FirebaseUtils !== 'undefined') {
                    const success = await FirebaseUtils.testFirebaseConnection();
                    
                    if (success) {
                        $('#firebase-status-text').text('✅ Todos os testes passaram!').addClass('text-green-600');
                    } else {
                        $('#firebase-status-text').text('❌ Alguns testes falharam').addClass('text-red-600');
                    }
                } else {
                    $('#firebase-status-text').text('❌ Firebase não carregado').addClass('text-red-600');
                }
            } catch (error) {
                console.error('Erro no teste:', error);
                $('#firebase-status-text').text('❌ Erro: ' + error.message).addClass('text-red-600');
            } finally {
                button.text(originalText).prop('disabled', false);
                
                // Limpar status após 5 segundos
                setTimeout(() => {
                    $('#firebase-status-text').text('').removeClass('text-green-600 text-red-600');
                }, 5000);
            }
        });
        
        // Adicionar informações de debug no console
        console.log('🎯 Para ativar debug em produção, adicione ?debug=true na URL');
        console.log('🧪 Use testFirebase() no console para teste manual');
        console.log('📊 Logs detalhados estão disponíveis no console');
    }
}

// Adicionar estilos CSS dinamicamente para notificações e estados
$('<style>').text(`
    .notification {
        position: fixed;
        top: 24px;
        right: 24px;
        padding: 16px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 600;
        z-index: 1001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.success {
        background: #2ECC71;
    }
    
    .notification.error {
        background: #E53E3E;
    }
    
    .notification.info {
        background: #4A90E2;
    }
    
    .focused {
        transform: scale(1.01);
        transition: transform 0.2s ease;
    }
    
    .spell-item {
        transition: all 0.2s ease;
    }
    
    .spell-item:hover {
        background-color: #f8fafc;
        border-color: #4A90E2;
    }
    
    .spell-slot-display {
        background: linear-gradient(145deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    .spell-used {
        opacity: 0.5;
        background: #fee2e2 !important;
    }
    
    .spell-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid #374151;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-block;
    }
    
    .spell-dot:hover {
        transform: scale(1.1);
        border-color: #4A90E2;
    }
    
    .spell-dot.used {
        background: #374151;
        box-shadow: 0 0 4px rgba(55, 65, 81, 0.5);
    }
    
    .spell-dot.level-1, .spell-dot.level-2, .spell-dot.level-3, 
    .spell-dot.level-4, .spell-dot.level-5 {
        border-color: #3B82F6;
    }
    
    .spell-dot.level-1.used, .spell-dot.level-2.used, .spell-dot.level-3.used,
    .spell-dot.level-4.used, .spell-dot.level-5.used {
        background: #3B82F6;
    }
    
    .spell-dot.level-6, .spell-dot.level-7 {
        border-color: #8B5CF6;
    }
    
    .spell-dot.level-6.used, .spell-dot.level-7.used {
        background: #8B5CF6;
    }
    
    .spell-dot.level-8, .spell-dot.level-9 {
        border-color: #EF4444;
    }
    
    .spell-dot.level-8.used, .spell-dot.level-9.used {
        background: #EF4444;
    }
    
    .spell-dot.focused {
        transform: scale(1.2);
        box-shadow: 0 0 8px rgba(74, 144, 226, 0.6);
    }
    
    .spell-dots-container {
        min-height: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 2px;
    }
`).appendTo('head');

// ===== SISTEMA DE MAGIAS =====

// Variável global para armazenar magias
let characterSpells = [];

// Inicializar sistema de magias
function initializeSpellSystem() {
    setupSpellEventListeners();
    loadSpellsFromStorage();
    updateSpellDisplay();
    
    // Inicializar bolinhas para todos os níveis
    for (let level = 1; level <= 9; level++) {
        updateSpellDots(level);
        
        // Event listener para quando o total de espaços mudar
        $(`#spell-slots-${level}-total`).on('input', function() {
            updateSpellDots(level);
        });
    }
}

// Event listeners para o sistema de magias
function setupSpellEventListeners() {
    // Adicionar magia
    $('#add-spell-btn').on('click', function() {
        addNewSpell();
    });
    
    // Descanso longo
    $('#long-rest-btn').on('click', function() {
        longRest();
    });
    
    // Filtros de magia
    $('#spell-filter-level, #spell-filter-school').on('change', function() {
        filterSpells();
    });
    
    // Auto-cálculo da CD de magia e bônus de ataque
    $('#spellcasting-ability').on('change', function() {
        updateSpellcastingStats();
    });
    
    // Atualizar quando modificadores mudarem
    $('.attribute-value').on('input', function() {
        setTimeout(updateSpellcastingStats, 100);
    });
}

// Adicionar nova magia
function addNewSpell() {
    const newSpell = {
        id: Date.now(),
        name: '',
        level: 0,
        school: '',
        castingTime: '',
        range: '',
        components: '',
        duration: '',
        description: '',
        prepared: false
    };
    
    characterSpells.push(newSpell);
    updateSpellDisplay();
    
    // Focar no campo nome da nova magia
    setTimeout(() => {
        $(`.spell-item[data-spell-id="${newSpell.id}"] input[name="name"]`).focus();
    }, 100);
}

// Remover magia
function removeSpell(spellId) {
    characterSpells = characterSpells.filter(spell => spell.id !== spellId);
    updateSpellDisplay();
    showNotification('Magia removida', 'info');
}

// Atualizar display das magias
function updateSpellDisplay() {
    const container = $('#spells-list');
    container.empty();
    
    if (characterSpells.length === 0) {
        container.html(`
            <div class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">✨</div>
                <p>Nenhuma magia adicionada ainda</p>
                <p class="text-sm">Clique em "ADICIONAR MAGIA" para começar</p>
            </div>
        `);
        return;
    }
    
    characterSpells.forEach(spell => {
        const spellHtml = createSpellHTML(spell);
        container.append(spellHtml);
    });
    
    // Reconfigurar event listeners
    setupSpellItemListeners();
}

// Criar HTML para uma magia
function createSpellHTML(spell) {
    const levelColor = getSpellLevelColor(spell.level);
    
    return $(`
        <div class="spell-item grid grid-cols-12 gap-2 p-3 border border-gray-200 rounded-lg ${spell.prepared ? 'bg-blue-50' : ''}" data-spell-id="${spell.id}">
            <div class="col-span-3">
                <input type="text" name="name" value="${spell.name}" placeholder="Nome da magia" 
                    class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-eletrico">
            </div>
            <div class="col-span-1">
                <select name="level" class="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-eletrico ${levelColor}">
                    <option value="0" ${spell.level == 0 ? 'selected' : ''}>T</option>
                    <option value="1" ${spell.level == 1 ? 'selected' : ''}>1</option>
                    <option value="2" ${spell.level == 2 ? 'selected' : ''}>2</option>
                    <option value="3" ${spell.level == 3 ? 'selected' : ''}>3</option>
                    <option value="4" ${spell.level == 4 ? 'selected' : ''}>4</option>
                    <option value="5" ${spell.level == 5 ? 'selected' : ''}>5</option>
                    <option value="6" ${spell.level == 6 ? 'selected' : ''}>6</option>
                    <option value="7" ${spell.level == 7 ? 'selected' : ''}>7</option>
                    <option value="8" ${spell.level == 8 ? 'selected' : ''}>8</option>
                    <option value="9" ${spell.level == 9 ? 'selected' : ''}>9</option>
                </select>
            </div>
            <div class="col-span-2">
                <select name="school" class="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-eletrico">
                    <option value="">Escola</option>
                    <option value="Abjuração" ${spell.school === 'Abjuração' ? 'selected' : ''}>Abjuração</option>
                    <option value="Adivinhação" ${spell.school === 'Adivinhação' ? 'selected' : ''}>Adivinhação</option>
                    <option value="Conjuração" ${spell.school === 'Conjuração' ? 'selected' : ''}>Conjuração</option>
                    <option value="Encantamento" ${spell.school === 'Encantamento' ? 'selected' : ''}>Encantamento</option>
                    <option value="Evocação" ${spell.school === 'Evocação' ? 'selected' : ''}>Evocação</option>
                    <option value="Ilusão" ${spell.school === 'Ilusão' ? 'selected' : ''}>Ilusão</option>
                    <option value="Necromancia" ${spell.school === 'Necromancia' ? 'selected' : ''}>Necromancia</option>
                    <option value="Transmutação" ${spell.school === 'Transmutação' ? 'selected' : ''}>Transmutação</option>
                </select>
            </div>
            <div class="col-span-1">
                <input type="text" name="castingTime" value="${spell.castingTime}" placeholder="1 ação" 
                    class="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-eletrico">
            </div>
            <div class="col-span-1">
                <input type="text" name="range" value="${spell.range}" placeholder="30 pés" 
                    class="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-eletrico">
            </div>
            <div class="col-span-2">
                <input type="text" name="components" value="${spell.components}" placeholder="V, S, M" 
                    class="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-eletrico">
            </div>
            <div class="col-span-1">
                <input type="text" name="duration" value="${spell.duration}" placeholder="Instantâneo" 
                    class="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-eletrico">
            </div>
            <div class="col-span-1 flex gap-1">
                <button class="prepare-spell-btn text-xs px-2 py-1 rounded ${spell.prepared ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}" 
                    title="${spell.prepared ? 'Preparada' : 'Não preparada'}">
                    ${spell.prepared ? '📖' : '📑'}
                </button>
                <button class="remove-spell-btn text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600" title="Remover">
                    🗑️
                </button>
            </div>
        </div>
        <div class="spell-description col-span-12 ${spell.id}">
            <textarea name="description" placeholder="Descrição da magia..." 
                class="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-eletrico resize-none"
                rows="2">${spell.description}</textarea>
        </div>
    `);
}

// Event listeners para itens de magia individuais
function setupSpellItemListeners() {
    // Atualizar dados da magia
    $('.spell-item input, .spell-item select, .spell-description textarea').on('input change', function() {
        const spellId = $(this).closest('.spell-item').data('spell-id') || 
                       $(this).closest('.spell-description').prev('.spell-item').data('spell-id');
        const field = $(this).attr('name');
        const value = $(this).val();
        
        updateSpellField(spellId, field, value);
    });
    
    // Preparar/Despreparar magia
    $('.prepare-spell-btn').on('click', function(e) {
        e.preventDefault();
        const spellId = $(this).closest('.spell-item').data('spell-id');
        toggleSpellPrepared(spellId);
    });
    
    // Remover magia
    $('.remove-spell-btn').on('click', function(e) {
        e.preventDefault();
        const spellId = $(this).closest('.spell-item').data('spell-id');
        removeSpell(spellId);
    });
}

// Atualizar campo específico de uma magia
function updateSpellField(spellId, field, value) {
    const spell = characterSpells.find(s => s.id == spellId);
    if (spell) {
        spell[field] = value;
        
        // Se mudou o nível, atualizar cor
        if (field === 'level') {
            const spellItem = $(`.spell-item[data-spell-id="${spellId}"]`);
            const levelSelect = spellItem.find('select[name="level"]');
            levelSelect.removeClass().addClass('w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-eletrico');
            levelSelect.addClass(getSpellLevelColor(value));
        }
    }
}

// Alternar estado preparado da magia
function toggleSpellPrepared(spellId) {
    const spell = characterSpells.find(s => s.id == spellId);
    if (spell) {
        spell.prepared = !spell.prepared;
        updateSpellDisplay();
    }
}

// Obter cor do nível da magia
function getSpellLevelColor(level) {
    const colors = {
        0: 'bg-gray-100',
        1: 'bg-blue-100',
        2: 'bg-blue-100',
        3: 'bg-blue-100',
        4: 'bg-blue-100',
        5: 'bg-blue-100',
        6: 'bg-purple-100',
        7: 'bg-purple-100',
        8: 'bg-red-100',
        9: 'bg-red-100'
    };
    return colors[level] || 'bg-gray-100';
}

// Filtrar magias
function filterSpells() {
    const levelFilter = $('#spell-filter-level').val();
    const schoolFilter = $('#spell-filter-school').val();
    
    $('.spell-item, .spell-description').each(function() {
        const spellItem = $(this).hasClass('spell-item') ? $(this) : $(this).prev('.spell-item');
        const spellId = spellItem.data('spell-id');
        const spell = characterSpells.find(s => s.id == spellId);
        
        if (spell) {
            let show = true;
            
            if (levelFilter && spell.level != levelFilter) {
                show = false;
            }
            
            if (schoolFilter && spell.school !== schoolFilter) {
                show = false;
            }
            
            if (show) {
                $(this).show();
            } else {
                $(this).hide();
            }
        }
    });
}

// Descanso longo - restaurar espaços de magia
function longRest() {
    // Restaurar todos os espaços de magia
    for (let level = 1; level <= 9; level++) {
        $(`#spell-slots-${level}-used`).val(0);
        updateSpellDots(level);
    }
    
    showNotification('🌙 Descanso longo realizado! Espaços de magia restaurados.', 'success');
}

// Atualizar bolinhas de espaços de magia
function updateSpellDots(level) {
    const totalSlots = parseInt($(`#spell-slots-${level}-total`).val()) || 0;
    const usedSlots = parseInt($(`#spell-slots-${level}-used`).val()) || 0;
    const dotsContainer = $(`#spell-dots-${level}`);
    
    // Limpar bolinhas existentes
    dotsContainer.empty();
    
    // Criar bolinhas baseado no total
    for (let i = 0; i < totalSlots; i++) {
        const dot = $(`<div class="spell-dot level-${level}" data-level="${level}" data-slot="${i}"></div>`);
        
        // Marcar como usado se necessário
        if (i < usedSlots) {
            dot.addClass('used');
        }
        
        // Event listener para clique
        dot.on('click', function() {
            toggleSpellSlot(level, i);
        });
        
        dotsContainer.append(dot);
    }
}

// Alternar estado de um espaço de magia específico
function toggleSpellSlot(level, slotIndex) {
    const dot = $(`.spell-dot[data-level="${level}"][data-slot="${slotIndex}"]`);
    const currentUsed = parseInt($(`#spell-slots-${level}-used`).val()) || 0;
    const totalSlots = parseInt($(`#spell-slots-${level}-total`).val()) || 0;
    
    if (dot.hasClass('used')) {
        // Se está usado, remover uso (e todos os posteriores)
        for (let i = slotIndex; i < totalSlots; i++) {
            $(`.spell-dot[data-level="${level}"][data-slot="${i}"]`).removeClass('used');
        }
        $(`#spell-slots-${level}-used`).val(slotIndex);
    } else {
        // Se não está usado, marcar como usado (e todos os anteriores)
        for (let i = 0; i <= slotIndex; i++) {
            $(`.spell-dot[data-level="${level}"][data-slot="${i}"]`).addClass('used');
        }
        $(`#spell-slots-${level}-used`).val(slotIndex + 1);
    }
    
    // Efeito visual ao clicar
    dot.addClass('focused');
    setTimeout(() => {
        dot.removeClass('focused');
    }, 200);
}

// Atualizar estatísticas de conjuração
function updateSpellcastingStats() {
    const ability = $('#spellcasting-ability').val();
    if (!ability) return;
    
    // Obter modificador do atributo
    let modifier = 0;
    switch(ability) {
        case 'int':
            modifier = getModifier(parseInt($('#intelligence').val()) || 10);
            break;
        case 'wis':
            modifier = getModifier(parseInt($('#wisdom').val()) || 10);
            break;
        case 'cha':
            modifier = getModifier(parseInt($('#charisma').val()) || 10);
            break;
    }
    
    // Obter bônus de proficiência (assumindo nível 1-20)
    const level = parseInt($('#level').val()) || 1;
    const proficiencyBonus = Math.ceil(level / 4) + 1;
    
    // Calcular CD e bônus de ataque
    const spellSaveDC = 8 + proficiencyBonus + modifier;
    const spellAttackBonus = proficiencyBonus + modifier;
    
    // Atualizar campos
    $('#spell-save-dc').val(spellSaveDC);
    $('#spell-attack-bonus').val(spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus);
}

// Carregar magias do localStorage
function loadSpellsFromStorage() {
    const saved = localStorage.getItem('characterSpells');
    if (saved) {
        try {
            characterSpells = JSON.parse(saved);
        } catch (e) {
            console.error('Erro ao carregar magias:', e);
            characterSpells = [];
        }
    }
}

// Salvar magias no localStorage
function saveSpellsToStorage() {
    localStorage.setItem('characterSpells', JSON.stringify(characterSpells));
}

// Incluir magias no sistema de salvamento
function includeSpellsInSave() {
    // Esta função será chamada durante saveCharacterData()
    return {
        spells: characterSpells,
        spellcastingAbility: $('#spellcasting-ability').val(),
        spellSaveDC: $('#spell-save-dc').val(),
        spellAttackBonus: $('#spell-attack-bonus').val(),
        cantripKnown: $('#cantrips-known').val(),
        spellSlots: {
            1: { total: $('#spell-slots-1-total').val(), used: $('#spell-slots-1-used').val() },
            2: { total: $('#spell-slots-2-total').val(), used: $('#spell-slots-2-used').val() },
            3: { total: $('#spell-slots-3-total').val(), used: $('#spell-slots-3-used').val() },
            4: { total: $('#spell-slots-4-total').val(), used: $('#spell-slots-4-used').val() },
            5: { total: $('#spell-slots-5-total').val(), used: $('#spell-slots-5-used').val() },
            6: { total: $('#spell-slots-6-total').val(), used: $('#spell-slots-6-used').val() },
            7: { total: $('#spell-slots-7-total').val(), used: $('#spell-slots-7-used').val() },
            8: { total: $('#spell-slots-8-total').val(), used: $('#spell-slots-8-used').val() },
            9: { total: $('#spell-slots-9-total').val(), used: $('#spell-slots-9-used').val() }
        }
    };
}

// Carregar dados de magias
function loadSpellData(spellData) {
    if (!spellData) return;
    
    // Carregar magias
    if (spellData.spells) {
        characterSpells = spellData.spells;
        updateSpellDisplay();
    }
    
    // Carregar configurações de conjuração
    if (spellData.spellcastingAbility) $('#spellcasting-ability').val(spellData.spellcastingAbility);
    if (spellData.spellSaveDC) $('#spell-save-dc').val(spellData.spellSaveDC);
    if (spellData.spellAttackBonus) $('#spell-attack-bonus').val(spellData.spellAttackBonus);
    if (spellData.cantripKnown) $('#cantrips-known').val(spellData.cantripKnown);
    
    // Carregar espaços de magia
    if (spellData.spellSlots) {
        for (let level = 1; level <= 9; level++) {
            if (spellData.spellSlots[level]) {
                $(`#spell-slots-${level}-total`).val(spellData.spellSlots[level].total || '');
                $(`#spell-slots-${level}-used`).val(spellData.spellSlots[level].used || '');
                // Atualizar bolinhas após carregar os dados
                updateSpellDots(level);
            }
        }
    }
}
