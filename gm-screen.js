// GM Screen JavaScript
$(document).ready(function() {
    initializeFirebase();
    initializeGMScreen();
    loadPlayersFromFirebase();
    setupEventListeners();
    startSessionTimer();
    loadGMNotes();
});

let players = [];
let currentEditingPlayer = null;
let sessionStartTime = null;
let sessionTimerInterval = null;
let isTimerRunning = false;
let db = null;
let autoRefreshInterval = null;
let isAutoRefreshEnabled = false;

function initializeFirebase() {
    try {
        // Usar a mesma configuração do arquivo principal
        const firebaseConfig = {
            apiKey: "AIzaSyARSykuZFgVtH-S1JX1k58CgC1OKBLBvdM",
            authDomain: "dndsheet-2b865.firebaseapp.com",
            projectId: "dndsheet-2b865",
            storageBucket: "dndsheet-2b865.firebasestorage.app",
            messagingSenderId: "660045034554",
            appId: "1:660045034554:web:5c017a7b999150048bf103",
            measurementId: "G-50N0WMT2BB"
        };

        // Inicializar Firebase se não estiver já inicializado
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        db = firebase.firestore();
        console.log('🔥 Firebase inicializado na GM Screen');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        showNotification('Erro ao conectar com Firebase. Usando dados locais.', 'warning');
    }
}

function initializeGMScreen() {
    console.log('🎲 GM Screen inicializada');
}

function setupEventListeners() {
    // Botões principais
    $('#refresh-players').on('click', loadPlayersFromFirebase);
    $('#toggle-auto-refresh').on('click', toggleAutoRefresh);
    $('#add-player').on('click', showAddPlayerDialog);
    
    // Modal
    $('#close-modal, #cancel-edit').on('click', closeModal);
    $('#save-player').on('click', savePlayerChanges);
    
    // Initiative
    $('#roll-initiative').on('click', rollInitiativeForAll);
    
    // Timer
    $('#start-timer').on('click', startTimer);
    $('#pause-timer').on('click', pauseTimer);
    $('#reset-timer').on('click', resetTimer);
    
    // Notes auto-save
    $('#gm-notes').on('input', saveGMNotes);
    
    // Conditions management
    $('#add-condition').on('click', addConditionToPlayer);
    
    // Fechar modal clicando fora
    $('#player-edit-modal').on('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

async function loadPlayersFromFirebase() {
    if (!db) {
        console.warn('Firebase não inicializado, carregando dados de exemplo');
        loadExamplePlayers();
        return;
    }

    try {
        showNotification('Carregando jogadores do Firebase...', 'info');
        
        // Buscar todas as fichas de personagem no Firebase
        const querySnapshot = await db.collection('characters').get();
        
        players = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const player = {
                id: doc.id,
                name: data.nome || data.name || 'Personagem Sem Nome',
                currentHp: parseInt(data.pontosDeVidaAtuais) || parseInt(data.currentHp) || 10,
                maxHp: parseInt(data.pontosDeVidaMaximos) || parseInt(data.maxHp) || 10,
                blight: parseInt(data.statusBlight) || parseInt(data.blight) || 0,
                rejection: parseInt(data.nivelDeRejeicao) || parseInt(data.rejection) || 0,
                neural: parseInt(data.sobrecargaNeural) || parseInt(data.neural) || 0,
                ac: parseInt(data.classeDeArmadura) || parseInt(data.ac) || 10,
                initiative: parseInt(data.modificadorIniciativa) || parseInt(data.initiative) || 0,
                class: data.classe || data.class || 'Classe Desconhecida',
                level: parseInt(data.nivel) || parseInt(data.level) || 1,
                conditions: data.condicoes || data.conditions || [],
                lastUpdate: data.lastUpdate || new Date().toISOString()
            };
            
            // Validar dados básicos
            if (player.maxHp <= 0) player.maxHp = 10;
            if (player.currentHp > player.maxHp) player.currentHp = player.maxHp;
            if (player.currentHp < 0) player.currentHp = 0;
            
            // Limitar valores de status entre 0-100
            player.blight = Math.max(0, Math.min(100, player.blight));
            player.rejection = Math.max(0, Math.min(100, player.rejection));
            player.neural = Math.max(0, Math.min(100, player.neural));
            
            players.push(player);
        });
        
        // Ordenar por última atualização (mais recente primeiro)
        players.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
        
        renderPlayers();
        savePlayers(); // Backup local
        
        const message = players.length > 0 
            ? `${players.length} jogador${players.length !== 1 ? 'es' : ''} carregado${players.length !== 1 ? 's' : ''} do Firebase!`
            : 'Nenhuma ficha encontrada no Firebase';
            
        showNotification(message, players.length > 0 ? 'success' : 'warning');
        
    } catch (error) {
        console.error('❌ Erro ao carregar jogadores do Firebase:', error);
        showNotification('Erro ao carregar do Firebase. Usando dados locais.', 'error');
        
        // Fallback para dados locais
        const savedPlayers = localStorage.getItem('gm-players');
        if (savedPlayers) {
            try {
                players = JSON.parse(savedPlayers);
                renderPlayers();
            } catch (localError) {
                console.error('Erro ao carregar dados locais:', localError);
                loadExamplePlayers();
            }
        } else {
            loadExamplePlayers();
        }
    }
}

function loadExamplePlayers() {
    // Dados de exemplo quando não há Firebase ou dados locais
    players = [
        {
            id: 'example1',
            name: 'Exemplo - Zara Blackfire',
            currentHp: 65,
            maxHp: 85,
            blight: 15,
            rejection: 25,
            neural: 10,
            ac: 18,
            initiative: 3,
            class: 'Soldado Cibernético',
            level: 7,
            conditions: [],
            lastUpdate: new Date().toISOString()
        }
    ];
    renderPlayers();
    showNotification('Carregados dados de exemplo (Firebase indisponível)', 'info');
}

function renderPlayers() {
    const $grid = $('#players-grid');
    $grid.empty();
    
    players.forEach(player => {
        const playerCard = createPlayerCard(player);
        $grid.append(playerCard);
    });
    
    $('#player-count').text(`${players.length} jogador${players.length !== 1 ? 'es' : ''}`);
}

function createPlayerCard(player) {
    const hpPercentage = (player.currentHp / player.maxHp) * 100;
    const hpClass = hpPercentage <= 25 ? 'hp-critical' : hpPercentage <= 50 ? 'hp-warning' : 'hp-healthy';
    
    const blightClass = player.blight <= 25 ? 'blight-low' : player.blight <= 50 ? 'blight-medium' : player.blight <= 75 ? 'blight-high' : 'blight-critical';
    const rejectionClass = player.rejection <= 25 ? 'rejection-low' : player.rejection <= 50 ? 'rejection-medium' : player.rejection <= 75 ? 'rejection-high' : 'rejection-critical';
    const neuralClass = player.neural <= 25 ? 'neural-low' : player.neural <= 50 ? 'neural-medium' : player.neural <= 75 ? 'neural-high' : 'neural-critical';
    
    const conditionsText = player.conditions && player.conditions.length > 0 ? 
        player.conditions.join(', ') : 'Nenhuma';
    
    // Indicador se os dados vêm do Firebase
    const isFromFirebase = !player.id.startsWith('example');
    const dataSource = isFromFirebase ? '🔥' : '💾';
    const dataTitle = isFromFirebase ? 'Dados do Firebase' : 'Dados locais/exemplo';
    
    // Mostrar última atualização se disponível
    const lastUpdateText = player.lastUpdate ? 
        new Date(player.lastUpdate).toLocaleString('pt-BR') : 'Não informado';
    
    return $(`
        <div class="player-card bg-gray-800 rounded-lg p-4 border border-gray-700" data-player-id="${player.id}">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-lg font-semibold text-white">${player.name}</h3>
                        <span class="text-xs" title="${dataTitle}">${dataSource}</span>
                    </div>
                    <p class="text-sm text-gray-400">${player.class} • Nível ${player.level}</p>
                    <p class="text-xs text-gray-500">Atualizado: ${lastUpdateText}</p>
                </div>
                <div class="flex gap-1 quick-edit">
                    <button class="edit-player bg-eletrico text-white px-2 py-1 rounded text-xs hover:bg-cyan-600" data-player-id="${player.id}">
                        ✏️
                    </button>
                    <button class="remove-player bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700" data-player-id="${player.id}">
                        🗑️
                    </button>
                </div>
            </div>
            
            <!-- HP Bar -->
            <div class="mb-3">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-medium text-gray-300">PONTOS DE VIDA</span>
                    <span class="text-xs text-white">${player.currentHp}/${player.maxHp}</span>
                </div>
                <div class="status-bar h-2 bg-gray-700">
                    <div class="h-full ${hpClass}" style="width: ${Math.max(0, hpPercentage)}%"></div>
                </div>
                <div class="flex gap-1 mt-1">
                    <button class="hp-adjust bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700" data-player-id="${player.id}" data-action="damage">
                        💥 -
                    </button>
                    <button class="hp-adjust bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700" data-player-id="${player.id}" data-action="heal">
                        ❤️ +
                    </button>
                </div>
            </div>
            
            <!-- Status Bars Grid -->
            <div class="grid grid-cols-3 gap-2 mb-3">
                <!-- Blight -->
                <div>
                    <div class="text-xs text-gray-300 mb-1">Blight</div>
                    <div class="status-bar h-1.5 bg-gray-700">
                        <div class="h-full ${blightClass}" style="width: ${player.blight}%"></div>
                    </div>
                    <div class="text-xs text-center text-gray-400 mt-1">${player.blight}%</div>
                </div>
                
                <!-- Rejection -->
                <div>
                    <div class="text-xs text-gray-300 mb-1">Rejeição</div>
                    <div class="status-bar h-1.5 bg-gray-700">
                        <div class="h-full ${rejectionClass}" style="width: ${player.rejection}%"></div>
                    </div>
                    <div class="text-xs text-center text-gray-400 mt-1">${player.rejection}%</div>
                </div>
                
                <!-- Neural -->
                <div>
                    <div class="text-xs text-gray-300 mb-1">Neural</div>
                    <div class="status-bar h-1.5 bg-gray-700">
                        <div class="h-full ${neuralClass}" style="width: ${player.neural}%"></div>
                    </div>
                    <div class="text-xs text-center text-gray-400 mt-1">${player.neural}%</div>
                </div>
            </div>
            
            <!-- Combat Stats -->
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="bg-gray-700 rounded p-2 text-center">
                    <div class="text-xs text-gray-300">CA</div>
                    <div class="text-lg font-semibold text-white">${player.ac}</div>
                </div>
                <div class="bg-gray-700 rounded p-2 text-center">
                    <div class="text-xs text-gray-300">Iniciativa</div>
                    <div class="text-lg font-semibold text-white">${player.initiative >= 0 ? '+' : ''}${player.initiative}</div>
                </div>
            </div>
            
            <!-- Conditions -->
            <div class="mb-3">
                <div class="text-xs text-gray-300 mb-1">Condições:</div>
                <div class="text-xs ${player.conditions && player.conditions.length > 0 ? 'text-yellow-400' : 'text-gray-400'} mb-2">
                    ${conditionsText}
                </div>
                <!-- Quick Condition Toggles -->
                <div class="grid grid-cols-3 gap-1">
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Envenenado') ? 'bg-purple-600' : 'bg-gray-600'} text-white px-1 py-1 rounded text-xs hover:opacity-80" 
                            data-player-id="${player.id}" data-condition="Envenenado">
                        🤢
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Amedrontado') ? 'bg-purple-600' : 'bg-gray-600'} text-white px-1 py-1 rounded text-xs hover:opacity-80" 
                            data-player-id="${player.id}" data-condition="Amedrontado">
                        😨
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Cego') ? 'bg-purple-600' : 'bg-gray-600'} text-white px-1 py-1 rounded text-xs hover:opacity-80" 
                            data-player-id="${player.id}" data-condition="Cego">
                        👁️
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Paralizado') ? 'bg-purple-600' : 'bg-gray-600'} text-white px-1 py-1 rounded text-xs hover:opacity-80" 
                            data-player-id="${player.id}" data-condition="Paralizado">
                        🥶
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Atordoado') ? 'bg-purple-600' : 'bg-gray-600'} text-white px-1 py-1 rounded text-xs hover:opacity-80" 
                            data-player-id="${player.id}" data-condition="Atordoado">
                        😵
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Caído') ? 'bg-purple-600' : 'bg-gray-600'} text-white px-1 py-1 rounded text-xs hover:opacity-80" 
                            data-player-id="${player.id}" data-condition="Caído">
                        ⬇️
                    </button>
                </div>
            </div>
        </div>
    `);
}

// Event delegation for dynamic elements
$(document).on('click', '.edit-player', function() {
    const playerId = $(this).data('player-id');
    editPlayer(playerId);
});

$(document).on('click', '.remove-player', function() {
    const playerId = $(this).data('player-id');
    const player = players.find(p => p.id === playerId);
    if (confirm(`Tem certeza que deseja remover ${player.name}?`)) {
        removePlayer(playerId);
    }
});

$(document).on('click', '.hp-adjust', function() {
    const playerId = $(this).data('player-id');
    const action = $(this).data('action');
    adjustPlayerHP(playerId, action);
});

$(document).on('click', '.remove-condition', function() {
    const condition = $(this).data('condition');
    removeConditionFromPlayer(condition);
});

$(document).on('click', '.quick-condition-toggle', function() {
    const playerId = $(this).data('player-id');
    const condition = $(this).data('condition');
    togglePlayerCondition(playerId, condition);
});

function editPlayer(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
    currentEditingPlayer = player;
    
    // Preencher modal com dados do jogador
    $('#edit-name').val(player.name);
    $('#edit-current-hp').val(player.currentHp);
    $('#edit-max-hp').val(player.maxHp);
    $('#edit-blight').val(player.blight);
    $('#edit-rejection').val(player.rejection);
    $('#edit-neural').val(player.neural);
    $('#edit-ac').val(player.ac);
    $('#edit-initiative').val(player.initiative);
    
    // Carregar condições
    renderPlayerConditions();
    
    $('#player-edit-modal').removeClass('hidden');
}

function closeModal() {
    $('#player-edit-modal').addClass('hidden');
    currentEditingPlayer = null;
    // Limpar container de condições
    $('#conditions-container').empty();
    $('#condition-select').val('');
}

function savePlayerChanges() {
    if (!currentEditingPlayer) return;
    
    // Atualizar dados do jogador
    currentEditingPlayer.name = $('#edit-name').val();
    currentEditingPlayer.currentHp = parseInt($('#edit-current-hp').val()) || 0;
    currentEditingPlayer.maxHp = parseInt($('#edit-max-hp').val()) || 1;
    currentEditingPlayer.blight = parseInt($('#edit-blight').val()) || 0;
    currentEditingPlayer.rejection = parseInt($('#edit-rejection').val()) || 0;
    currentEditingPlayer.neural = parseInt($('#edit-neural').val()) || 0;
    currentEditingPlayer.ac = parseInt($('#edit-ac').val()) || 10;
    currentEditingPlayer.initiative = parseInt($('#edit-initiative').val()) || 0;
    
    // Atualizar timestamp
    currentEditingPlayer.lastUpdate = new Date().toISOString();
    
    // Sincronizar com Firebase
    syncPlayerToFirebase(currentEditingPlayer);
    
    savePlayers();
    renderPlayers();
    closeModal();
    
    showNotification(`${currentEditingPlayer.name} atualizado com sucesso!`, 'success');
}

async function syncPlayerToFirebase(player) {
    if (!db || !player.id || player.id.startsWith('example')) {
        console.log('Firebase indisponível ou jogador de exemplo, salvando apenas localmente');
        return;
    }

    try {
        // Preparar dados para o Firebase (usar nomes dos campos da ficha original)
        const firebaseData = {
            nome: player.name,
            pontosDeVidaAtuais: player.currentHp,
            pontosDeVidaMaximos: player.maxHp,
            statusBlight: player.blight,
            nivelDeRejeicao: player.rejection,
            sobrecargaNeural: player.neural,
            classeDeArmadura: player.ac,
            modificadorIniciativa: player.initiative,
            classe: player.class,
            nivel: player.level,
            condicoes: player.conditions || [],
            lastUpdate: new Date().toISOString(),
            updatedByGM: true
        };

        await db.collection('characters').doc(player.id).update(firebaseData);
        console.log(`✅ Jogador ${player.name} sincronizado com Firebase`);
        
    } catch (error) {
        console.error('❌ Erro ao sincronizar com Firebase:', error);
        showNotification('Dados salvos localmente (erro na sincronização)', 'warning');
    }
}

function adjustPlayerHP(playerId, action) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
    const amount = prompt(`Digite a quantidade para ${action === 'damage' ? 'dano' : 'cura'}:`);
    if (!amount || isNaN(amount)) return;
    
    const value = parseInt(amount);
    
    if (action === 'damage') {
        player.currentHp = Math.max(0, player.currentHp - value);
        showNotification(`${player.name} recebeu ${value} de dano`, 'warning');
    } else {
        player.currentHp = Math.min(player.maxHp, player.currentHp + value);
        showNotification(`${player.name} foi curado em ${value} HP`, 'success');
    }
    
    // Sincronizar com Firebase
    syncPlayerToFirebase(player);
    
    savePlayers();
    renderPlayers();
}

function removePlayer(playerId) {
    players = players.filter(p => p.id !== playerId);
    savePlayers();
    renderPlayers();
    showNotification('Jogador removido', 'info');
}

function showAddPlayerDialog() {
    currentEditingPlayer = {
        id: 'player-' + Date.now(),
        name: '',
        currentHp: 10,
        maxHp: 10,
        blight: 0,
        rejection: 0,
        neural: 0,
        ac: 10,
        initiative: 0,
        class: 'Novo Personagem',
        level: 1,
        conditions: []
    };
    
    // Limpar campos
    $('#edit-name').val('');
    $('#edit-current-hp').val(10);
    $('#edit-max-hp').val(10);
    $('#edit-blight').val(0);
    $('#edit-rejection').val(0);
    $('#edit-neural').val(0);
    $('#edit-ac').val(10);
    $('#edit-initiative').val(0);
    
    // Limpar condições
    renderPlayerConditions();
    
    $('#player-edit-modal').removeClass('hidden');
    
    // Modificar comportamento do botão salvar
    $('#save-player').off('click').on('click', function() {
        if (!$('#edit-name').val().trim()) {
            showNotification('Nome é obrigatório!', 'error');
            return;
        }
        
        currentEditingPlayer.name = $('#edit-name').val();
        currentEditingPlayer.currentHp = parseInt($('#edit-current-hp').val()) || 10;
        currentEditingPlayer.maxHp = parseInt($('#edit-max-hp').val()) || 10;
        currentEditingPlayer.blight = parseInt($('#edit-blight').val()) || 0;
        currentEditingPlayer.rejection = parseInt($('#edit-rejection').val()) || 0;
        currentEditingPlayer.neural = parseInt($('#edit-neural').val()) || 0;
        currentEditingPlayer.ac = parseInt($('#edit-ac').val()) || 10;
        currentEditingPlayer.initiative = parseInt($('#edit-initiative').val()) || 0;
        
        players.push(currentEditingPlayer);
        savePlayers();
        renderPlayers();
        closeModal();
        
        showNotification(`${currentEditingPlayer.name} adicionado com sucesso!`, 'success');
        
        // Restaurar comportamento normal
        $('#save-player').off('click').on('click', savePlayerChanges);
    });
}

function rollInitiativeForAll() {
    players.forEach(player => {
        const roll = Math.floor(Math.random() * 20) + 1;
        player.initiativeRoll = roll + player.initiative;
    });
    
    // Ordenar por iniciativa
    const sortedPlayers = [...players].sort((a, b) => b.initiativeRoll - a.initiativeRoll);
    
    const $list = $('#initiative-list');
    $list.empty();
    
    sortedPlayers.forEach((player, index) => {
        $list.append(`
            <div class="flex justify-between items-center py-1 px-2 rounded ${index === 0 ? 'bg-yellow-600' : 'bg-gray-700'}">
                <span class="text-sm">${player.name}</span>
                <span class="text-sm font-mono">${player.initiativeRoll}</span>
            </div>
        `);
    });
    
    showNotification('Iniciativa rolada para todos!', 'success');
}

function savePlayers() {
    localStorage.setItem('gm-players', JSON.stringify(players));
}

function saveGMNotes() {
    const notes = $('#gm-notes').val();
    localStorage.setItem('gm-notes', notes);
}

function loadGMNotes() {
    const notes = localStorage.getItem('gm-notes');
    if (notes) {
        $('#gm-notes').val(notes);
    }
}

// Session Timer Functions
function startSessionTimer() {
    const savedTime = localStorage.getItem('session-start-time');
    if (savedTime) {
        sessionStartTime = new Date(savedTime);
        isTimerRunning = true;
        sessionTimerInterval = setInterval(updateTimerDisplay, 1000);
        updateTimerDisplay();
    }
}

function startTimer() {
    if (!isTimerRunning) {
        if (!sessionStartTime) {
            sessionStartTime = new Date();
            localStorage.setItem('session-start-time', sessionStartTime.toISOString());
        }
        isTimerRunning = true;
        sessionTimerInterval = setInterval(updateTimerDisplay, 1000);
        showNotification('Timer iniciado!', 'info');
    }
}

function pauseTimer() {
    if (isTimerRunning) {
        isTimerRunning = false;
        clearInterval(sessionTimerInterval);
        showNotification('Timer pausado!', 'warning');
    }
}

function resetTimer() {
    isTimerRunning = false;
    clearInterval(sessionTimerInterval);
    sessionStartTime = null;
    localStorage.removeItem('session-start-time');
    $('#session-timer').text('00:00:00');
    showNotification('Timer resetado!', 'info');
}

function updateTimerDisplay() {
    if (!sessionStartTime || !isTimerRunning) return;
    
    const now = new Date();
    const elapsed = now - sessionStartTime;
    
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    $('#session-timer').text(display);
}

function toggleAutoRefresh() {
    const $button = $('#toggle-auto-refresh');
    
    if (isAutoRefreshEnabled) {
        // Desabilitar auto-refresh
        clearInterval(autoRefreshInterval);
        isAutoRefreshEnabled = false;
        $button.text('🔄 Auto-Atualizar: OFF').removeClass('bg-green-600').addClass('bg-yellow-600');
        showNotification('Auto-atualização desabilitada', 'info');
    } else {
        // Habilitar auto-refresh (a cada 10 segundos)
        autoRefreshInterval = setInterval(() => {
            loadPlayersFromFirebase();
        }, 10000);
        isAutoRefreshEnabled = true;
        $button.text('🔄 Auto-Atualizar: ON').removeClass('bg-yellow-600').addClass('bg-green-600');
        showNotification('Auto-atualização habilitada (10s)', 'success');
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

// Funções para gerenciar condições
function renderPlayerConditions() {
    if (!currentEditingPlayer) return;
    
    const $container = $('#conditions-container');
    $container.empty();
    
    if (!currentEditingPlayer.conditions) {
        currentEditingPlayer.conditions = [];
    }
    
    currentEditingPlayer.conditions.forEach(condition => {
        const conditionElement = $(`
            <div class="flex justify-between items-center bg-gray-700 rounded px-3 py-2">
                <span class="text-sm text-white">${condition}</span>
                <button class="remove-condition text-red-400 hover:text-red-300 text-xs" data-condition="${condition}">
                    ✕
                </button>
            </div>
        `);
        $container.append(conditionElement);
    });
    
    if (currentEditingPlayer.conditions.length === 0) {
        $container.append('<div class="text-gray-400 text-sm text-center py-2">Nenhuma condição ativa</div>');
    }
}

function addConditionToPlayer() {
    if (!currentEditingPlayer) return;
    
    const condition = $('#condition-select').val();
    if (!condition) {
        showNotification('Selecione uma condição primeiro!', 'warning');
        return;
    }
    
    if (!currentEditingPlayer.conditions) {
        currentEditingPlayer.conditions = [];
    }
    
    if (currentEditingPlayer.conditions.includes(condition)) {
        showNotification('Condição já está ativa!', 'warning');
        return;
    }
    
    currentEditingPlayer.conditions.push(condition);
    renderPlayerConditions();
    $('#condition-select').val('');
    
    showNotification(`Condição "${condition}" adicionada!`, 'success');
}

function removeConditionFromPlayer(condition) {
    if (!currentEditingPlayer || !currentEditingPlayer.conditions) return;
    
    currentEditingPlayer.conditions = currentEditingPlayer.conditions.filter(c => c !== condition);
    renderPlayerConditions();
    
    showNotification(`Condição "${condition}" removida!`, 'info');
}

function togglePlayerCondition(playerId, condition) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
    if (!player.conditions) {
        player.conditions = [];
    }
    
    const conditionIndex = player.conditions.indexOf(condition);
    
    if (conditionIndex >= 0) {
        // Remover condição
        player.conditions.splice(conditionIndex, 1);
        showNotification(`${player.name}: "${condition}" removida`, 'info');
    } else {
        // Adicionar condição
        player.conditions.push(condition);
        showNotification(`${player.name}: "${condition}" adicionada`, 'warning');
    }
    
    // Atualizar timestamp
    player.lastUpdate = new Date().toISOString();
    
    // Sincronizar com Firebase
    syncPlayerToFirebase(player);
    
    savePlayers();
    renderPlayers();
}
