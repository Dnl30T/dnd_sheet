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
        
        // Teste de conectividade
        db.enableNetwork().then(() => {
            $('#firebase-indicator').html('🔥 Firebase conectado').addClass('text-green-500').removeClass('text-gray-500 text-red-500');
            console.log('✅ Firebase conectado com sucesso');
        }).catch((error) => {
            $('#firebase-indicator').html('❌ Firebase offline').addClass('text-red-500').removeClass('text-gray-500 text-green-500');
            console.error('❌ Erro na conectividade:', error);
        });
        
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        $('#firebase-indicator').html('❌ Erro no Firebase').addClass('text-red-500').removeClass('text-gray-500 text-green-500');
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
    $('#test-firebase-connection').on('click', testFirebaseConnection);
    $('#add-player').on('click', showAddPlayerDialog);
    
    // Collapse toggles
    $('#toggle-photos').on('click', togglePhotosSection);
    $('#toggle-players').on('click', togglePlayersSection);
    
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
    
    // Photo upload management
    $('#select-photo').on('click', function() {
        $('#photo-upload').click();
    });
    
    $('#photo-upload').on('change', handlePhotoUpload);
    $('#remove-photo').on('click', removePhoto);
    
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
        console.log('🔍 Buscando personagens na coleção "characters"...');
        
        // Buscar todas as fichas de personagem no Firebase
        const querySnapshot = await db.collection('characters').get();
        console.log('📊 Total de documentos encontrados:', querySnapshot.size);
        
        players = [];
        
        if (querySnapshot.empty) {
            console.log('⚠️ Nenhum documento encontrado na coleção characters');
            showNotification('Nenhuma ficha encontrada no Firebase', 'warning');
            loadExamplePlayers();
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('📊 Dados do Firebase para', doc.id, ':', data);
            
            const player = {
                id: doc.id,
                name: data.name || 'Personagem Sem Nome',
                currentHp: parseInt(data.currentHp) || 10,
                maxHp: parseInt(data.maxHp) || 10,
                blight: parseInt(data.blightLevel) || 0,
                rejection: parseInt(data.rejectionLevel) || 0,
                neural: parseInt(data.neuralOverload) || 0,
                ac: parseInt(data.armorClass) || 10,
                initiative: parseInt(data.initiative) || 0,
                class: data.classLevel || 'Classe Desconhecida',
                level: extractLevelFromClassLevel(data.classLevel) || 1,
                conditions: data.conditions || [],
                photo: data.photo || null,
                lastUpdate: data.lastSaved || data.lastUpdate || new Date().toISOString()
            };
            
            console.log('👤 Player processado:', player);
            
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

function extractLevelFromClassLevel(classLevel) {
    if (!classLevel) return 1;
    const match = classLevel.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
}

function renderPlayers() {
    const $grid = $('#players-grid');
    $grid.empty();
    
    players.forEach(player => {
        const playerCard = createPlayerCard(player);
        $grid.append(playerCard);
    });
    
    $('#player-count').text(`${players.length} jogador${players.length !== 1 ? 'es' : ''}`);
    
    // Renderizar também a seção de fotos
    renderCharacterPhotos();
}

function renderCharacterPhotos() {
    const $photosContainer = $('#character-photos');
    $photosContainer.empty();
    
    if (players.length === 0) {
        $photosContainer.append(`
            <div class="text-gray-400 text-center w-full py-4">
                <p>📷 Nenhum personagem para exibir</p>
            </div>
        `);
        return;
    }
    
    players.forEach(player => {
        const photoCard = createCharacterPhotoCard(player);
        $photosContainer.append(photoCard);
    });
}

function createCharacterPhotoCard(player) {
    const hpPercentage = (player.currentHp / player.maxHp) * 100;
    const hpClass = hpPercentage <= 25 ? 'hp-critical' : hpPercentage <= 50 ? 'hp-warning' : 'hp-healthy';
    
    // Verificar se o personagem tem uma foto salva
    const characterPhoto = player.photo || null;
    
    return $(`
        <div class="character-photo-card w-40 h-52 bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-green-500 rounded-2xl overflow-hidden shadow-xl transform transition-all duration-300 hover:scale-105 hover:border-yellow-500 cursor-pointer" data-player-id="${player.id}" title="${player.name}">
            <div class="h-32 bg-gradient-to-b from-gray-600 to-gray-700 flex items-center justify-center text-3xl text-gray-400 relative overflow-hidden">
                ${characterPhoto ? 
                    `<img src="${characterPhoto}" alt="${player.name}" class="w-full h-full object-cover">` : 
                    '👤'
                }
            </div>
            <div class="p-3 bg-gradient-to-t from-black to-gray-800">
                <div class="text-xs font-bold text-white text-center mb-2 truncate">${player.name}</div>
                <div class="h-2 bg-gray-600 rounded-full overflow-hidden mb-1">
                    <div class="h-full ${hpClass} transition-all duration-500" style="width: ${Math.max(0, hpPercentage)}%"></div>
                </div>
                <div class="text-xs text-gray-300 text-center font-medium">${player.currentHp}/${player.maxHp} HP</div>
            </div>
        </div>
    `);
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
        <div class="player-card bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 border-2 border-green-500 shadow-xl transform transition-all duration-300 hover:scale-105 hover:border-yellow-500" data-player-id="${player.id}">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <h3 class="text-xl font-bold text-white bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">${player.name}</h3>
                        <span class="text-lg" title="${dataTitle}">${dataSource}</span>
                    </div>
                    <p class="text-sm text-gray-300 font-medium">${player.class} • Nível ${player.level}</p>
                    <p class="text-xs text-gray-400 font-mono">📅 ${lastUpdateText}</p>
                </div>
                <div class="flex gap-2 quick-edit opacity-0 transition-opacity duration-300">
                    <button class="edit-player bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg text-xs hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md transform hover:scale-110" data-player-id="${player.id}">
                        ✏️
                    </button>
                    <button class="remove-player bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-lg text-xs hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md transform hover:scale-110" data-player-id="${player.id}">
                        🗑️
                    </button>
                </div>
            </div>
            
            <!-- HP Bar -->
            <div class="mb-6 bg-gray-800 bg-opacity-50 p-4 rounded-xl border border-gray-600">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold text-green-400">💚 PONTOS DE VIDA</span>
                    <span class="text-sm text-white font-mono bg-gray-700 px-2 py-1 rounded">${player.currentHp}/${player.maxHp}</span>
                </div>
                <div class="h-4 bg-gray-700 rounded-full overflow-hidden border border-gray-600 shadow-inner">
                    <div class="h-full ${hpClass} transition-all duration-500" style="width: ${Math.max(0, hpPercentage)}%"></div>
                </div>
                <div class="flex gap-2 mt-3">
                    <button class="hp-adjust bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md transform hover:scale-105 font-semibold" data-player-id="${player.id}" data-action="damage">
                        💥 Dano
                    </button>
                    <button class="hp-adjust bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg text-sm hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-md transform hover:scale-105 font-semibold" data-player-id="${player.id}" data-action="heal">
                        ❤️ Cura
                    </button>
                </div>
            </div>
            
            <!-- Status Bars Grid -->
            <div class="grid grid-cols-3 gap-4 mb-6">
                <!-- Blight -->
                <div class="bg-gray-800 bg-opacity-50 p-3 rounded-xl border border-gray-600">
                    <div class="text-xs font-semibold text-red-400 mb-2 text-center">🦠 BLIGHT</div>
                    <div class="h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                        <div class="h-full ${blightClass} transition-all duration-500" style="width: ${player.blight}%"></div>
                    </div>
                    <div class="text-xs text-center text-gray-300 mt-2 font-mono">${player.blight}%</div>
                </div>
                
                <!-- Rejection -->
                <div class="bg-gray-800 bg-opacity-50 p-3 rounded-xl border border-gray-600">
                    <div class="text-xs font-semibold text-purple-400 mb-2 text-center">🚫 REJEIÇÃO</div>
                    <div class="h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                        <div class="h-full ${rejectionClass} transition-all duration-500" style="width: ${player.rejection}%"></div>
                    </div>
                    <div class="text-xs text-center text-gray-300 mt-2 font-mono">${player.rejection}%</div>
                </div>
                
                <!-- Neural -->
                <div class="bg-gray-800 bg-opacity-50 p-3 rounded-xl border border-gray-600">
                    <div class="text-xs font-semibold text-yellow-400 mb-2 text-center">🧠 NEURAL</div>
                    <div class="h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                        <div class="h-full ${neuralClass} transition-all duration-500" style="width: ${player.neural}%"></div>
                    </div>
                    <div class="text-xs text-center text-gray-300 mt-2 font-mono">${player.neural}%</div>
                </div>
            </div>
            
            <!-- Combat Stats -->
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-center shadow-lg border border-blue-500">
                    <div class="text-xs font-semibold text-blue-100 mb-1">🛡️ CLASSE DE ARMADURA</div>
                    <div class="text-2xl font-black text-white">${player.ac}</div>
                </div>
                <div class="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-4 text-center shadow-lg border border-orange-500">
                    <div class="text-xs font-semibold text-orange-100 mb-1">⚡ INICIATIVA</div>
                    <div class="text-2xl font-black text-white">${player.initiative >= 0 ? '+' : ''}${player.initiative}</div>
                </div>
            </div>
            
            <!-- Conditions -->
            <div class="bg-gray-800 bg-opacity-50 p-4 rounded-xl border border-gray-600">
                <div class="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    🎭 CONDIÇÕES ATIVAS
                </div>
                <div class="text-sm ${player.conditions && player.conditions.length > 0 ? 'text-yellow-300' : 'text-gray-400'} mb-4 font-medium">
                    ${conditionsText}
                </div>
                <!-- Quick Condition Toggles -->
                <div class="grid grid-cols-3 gap-2">
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Envenenado') ? 'bg-gradient-to-r from-purple-600 to-purple-700 border-purple-400' : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500'} text-white px-3 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105 border-2 shadow-md font-semibold" 
                            data-player-id="${player.id}" data-condition="Envenenado">
                        🤢 Veneno
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Amedrontado') ? 'bg-gradient-to-r from-purple-600 to-purple-700 border-purple-400' : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500'} text-white px-3 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105 border-2 shadow-md font-semibold" 
                            data-player-id="${player.id}" data-condition="Amedrontado">
                        😨 Medo
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Cego') ? 'bg-gradient-to-r from-purple-600 to-purple-700 border-purple-400' : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500'} text-white px-3 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105 border-2 shadow-md font-semibold" 
                            data-player-id="${player.id}" data-condition="Cego">
                        👁️ Cego
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Paralizado') ? 'bg-gradient-to-r from-purple-600 to-purple-700 border-purple-400' : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500'} text-white px-3 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105 border-2 shadow-md font-semibold" 
                            data-player-id="${player.id}" data-condition="Paralizado">
                        🥶 Paralizado
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Atordoado') ? 'bg-gradient-to-r from-purple-600 to-purple-700 border-purple-400' : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500'} text-white px-3 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105 border-2 shadow-md font-semibold" 
                            data-player-id="${player.id}" data-condition="Atordoado">
                        😵 Atordoado
                    </button>
                    <button class="quick-condition-toggle ${player.conditions && player.conditions.includes('Caído') ? 'bg-gradient-to-r from-purple-600 to-purple-700 border-purple-400' : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500'} text-white px-3 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105 border-2 shadow-md font-semibold" 
                            data-player-id="${player.id}" data-condition="Caído">
                        ⬇️ Caído
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
    
    console.log('🗑️ Tentando remover jogador:', playerId, player);
    
    if (!player) {
        console.error('❌ Jogador não encontrado:', playerId);
        showNotification('Erro: Jogador não encontrado!', 'error');
        return;
    }
    
    if (confirm(`Tem certeza que deseja remover ${player.name}?`)) {
        console.log('✅ Confirmado - removendo jogador:', player.name);
        removePlayer(playerId);
    } else {
        console.log('❌ Cancelado - não removendo jogador:', player.name);
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

$(document).on('click', '.character-photo-card', function() {
    const playerId = $(this).data('player-id');
    editPlayer(playerId);
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
    
    // Carregar foto se existir
    updatePhotoPreview(player.photo);
    
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
    // Limpar preview de foto
    updatePhotoPreview(null);
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
    
    // Salvar foto se foi alterada
    const photoPreview = $('#photo-preview');
    if (photoPreview.find('img').length > 0) {
        currentEditingPlayer.photo = photoPreview.find('img').attr('src');
    }
    
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
            name: player.name,
            currentHp: player.currentHp,
            maxHp: player.maxHp,
            blightLevel: player.blight,
            rejectionLevel: player.rejection,
            neuralOverload: player.neural,
            armorClass: player.ac,
            initiative: player.initiative,
            classLevel: player.class,
            conditions: player.conditions || [],
            photo: player.photo || null,
            lastSaved: new Date().toISOString(),
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

async function removePlayer(playerId) {
    console.log('🗑️ removePlayer chamada para ID:', playerId);
    
    const player = players.find(p => p.id === playerId);
    if (!player) {
        console.error('❌ Jogador não encontrado no array players:', playerId);
        return;
    }
    
    console.log('✅ Jogador encontrado:', player.name, 'ID:', player.id);
    
    // Pausar auto-refresh temporariamente para evitar conflitos
    const wasAutoRefreshEnabled = isAutoRefreshEnabled;
    if (isAutoRefreshEnabled) {
        console.log('⏸️ Pausando auto-refresh temporariamente...');
        clearInterval(autoRefreshInterval);
    }
    
    // Remover do Firebase primeiro
    if (db && !playerId.startsWith('example')) {
        try {
            console.log('🔥 Removendo do Firebase primeiro:', playerId);
            await db.collection('characters').doc(playerId).delete();
            console.log(`✅ Jogador ${player.name} removido do Firebase`);
        } catch (error) {
            console.error('❌ Erro ao remover do Firebase:', error);
            showNotification(`Erro ao remover ${player.name} do Firebase`, 'error');
            
            // Reativar auto-refresh se estava ativo
            if (wasAutoRefreshEnabled) {
                autoRefreshInterval = setInterval(() => {
                    loadPlayersFromFirebase();
                }, 10000);
            }
            return;
        }
    }
    
    // Remover do array local
    const initialLength = players.length;
    players = players.filter(p => p.id !== playerId);
    const finalLength = players.length;
    
    console.log(`📊 Array players: ${initialLength} -> ${finalLength} jogadores`);
    
    console.log('💾 Salvando e re-renderizando...');
    savePlayers();
    renderPlayers();
    
    // Reativar auto-refresh se estava ativo
    if (wasAutoRefreshEnabled) {
        console.log('▶️ Reativando auto-refresh...');
        autoRefreshInterval = setInterval(() => {
            loadPlayersFromFirebase();
        }, 10000);
    }
    
    showNotification(`${player.name} removido com sucesso!`, 'success');
    console.log('✅ Remoção concluída');
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
    
    // Limpar foto
    updatePhotoPreview(null);
    
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

async function testFirebaseConnection() {
    const $button = $('#test-firebase-connection');
    const originalText = $button.text();
    
    $button.text('🔄 Testando...').prop('disabled', true);
    
    try {
        if (!db) {
            showNotification('❌ Firebase não inicializado', 'error');
            return;
        }
        
        console.log('🧪 Iniciando teste de conexão Firebase...');
        
        // Teste 1: Verificar se pode acessar a coleção
        const testQuery = await db.collection('characters').limit(1).get();
        console.log('✅ Teste 1: Acesso à coleção - OK');
        
        // Teste 2: Listar todos os documentos
        const allDocs = await db.collection('characters').get();
        console.log(`✅ Teste 2: Total de documentos encontrados: ${allDocs.size}`);
        
        // Teste 3: Mostrar dados de cada documento
        allDocs.forEach((doc, index) => {
            console.log(`📄 Documento ${index + 1}:`, {
                id: doc.id,
                data: doc.data()
            });
        });
        
        if (allDocs.size > 0) {
            showNotification(`✅ Firebase conectado! ${allDocs.size} personagem(ns) encontrado(s)`, 'success');
        } else {
            showNotification('⚠️ Firebase conectado mas sem personagens salvos', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste Firebase:', error);
        showNotification('❌ Erro na conexão: ' + error.message, 'error');
    } finally {
        $button.text(originalText).prop('disabled', false);
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

// Funções para gerenciar fotos
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Verificar tamanho do arquivo (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Arquivo muito grande! Máximo 2MB.', 'error');
        return;
    }
    
    // Verificar tipo do arquivo
    if (!file.type.startsWith('image/')) {
        showNotification('Arquivo deve ser uma imagem!', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        updatePhotoPreview(e.target.result);
        showNotification('Foto carregada! Clique em "Salvar" para confirmar.', 'success');
    };
    reader.readAsDataURL(file);
}

function updatePhotoPreview(photoSrc) {
    const $preview = $('#photo-preview');
    $preview.empty();
    
    if (photoSrc) {
        $preview.html(`<img src="${photoSrc}" alt="Preview" class="w-full h-full object-cover rounded">`);
    } else {
        $preview.html('👤').addClass('text-gray-400 text-xl');
    }
}

function removePhoto() {
    updatePhotoPreview(null);
    $('#photo-upload').val('');
    if (currentEditingPlayer) {
        currentEditingPlayer.photo = null;
    }
    showNotification('Foto removida! Clique em "Salvar" para confirmar.', 'info');
}

// Funções de Collapse
function togglePhotosSection() {
    const $section = $('.character-photos-section');
    const $photos = $('#character-photos');
    const $icon = $('#photos-toggle-icon');
    const $text = $('#photos-toggle-text');
    
    if ($photos.hasClass('hidden')) {
        // Expandir
        $photos.removeClass('hidden').addClass('grid');
        $section.removeClass('collapsed');
        $icon.text('📐');
        $text.text('Recolher');
    } else {
        // Recolher
        $photos.removeClass('grid').addClass('hidden');
        $section.addClass('collapsed');
        $icon.text('📋');
        $text.text('Expandir');
    }
}

function togglePlayersSection() {
    const $section = $('.players-section');
    const $players = $('#players-grid');
    const $icon = $('#players-toggle-icon');
    const $text = $('#players-toggle-text');
    
    if ($players.hasClass('hidden')) {
        // Expandir
        $players.removeClass('hidden').addClass('grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6');
        $section.removeClass('collapsed');
        $icon.text('📐');
        $text.text('Recolher');
    } else {
        // Recolher
        $players.removeClass('grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6').addClass('hidden');
        $section.addClass('collapsed');
        $icon.text('👥');
        $text.text('Expandir');
    }
}
