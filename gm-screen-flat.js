// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCRFXpqYeZPu_KYXc5CYx5s2RBYdA2Xe3k",
    authDomain: "fichadnd-3b05b.firebaseapp.com",
    projectId: "fichadnd-3b05b",
    storageBucket: "fichadnd-3b05b.appspot.com",
    messagingSenderId: "1008095085746",
    appId: "1:1008095085746:web:8a7d0bb4f9e4f5a7f1e1b8"
};

// Initialize Firebase
let db;
let players = new Map();
let autoRefresh = false;
let autoRefreshInterval;
let sessionTimer = {
    startTime: null,
    isRunning: false,
    elapsed: 0,
    interval: null
};

$(document).ready(function() {
    initializeFirebase();
    setupEventListeners();
    updateFirebaseStatus('⚡ Conectando...', 'text-amber-500');
});

function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        updateFirebaseStatus('✅ Conectado', 'text-success');
        loadPlayers();
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        updateFirebaseStatus('❌ Erro de conexão', 'text-danger');
    }
}

function updateFirebaseStatus(message, className) {
    const indicator = $('#firebase-indicator');
    indicator.text(message).removeClass().addClass(className);
}

function setupEventListeners() {
    // Header buttons
    $('#refresh-players').click(loadPlayers);
    $('#toggle-auto-refresh').click(toggleAutoRefresh);
    $('#add-player').click(showAddPlayerModal);
    
    // Toggle sections
    $('#toggle-photos').click(() => toggleSection('character-photos', 'photos'));
    $('#toggle-players').click(() => toggleSection('players-grid', 'players'));
    
    // Modal controls
    $('#close-modal, #cancel-edit').click(closeModal);
    $('#save-player').click(savePlayer);
    
    // Photo upload
    $('#select-photo').click(() => $('#photo-upload').click());
    $('#remove-photo').click(removePhoto);
    $('#photo-upload').change(handlePhotoUpload);
    
    // Conditions
    $('#add-condition').click(addCondition);
    
    // Session timer
    $('#start-timer').click(startTimer);
    $('#pause-timer').click(pauseTimer);
    $('#reset-timer').click(resetTimer);
    
    // Initiative
    $('#roll-initiative').click(rollInitiative);
    
    // Save notes on change
    $('#gm-notes').on('input', saveNotes);
    
    // Load saved notes
    loadNotes();
}

function toggleSection(sectionId, toggleName) {
    const section = $(`#${sectionId}`);
    const isVisible = section.is(':visible');
    
    if (isVisible) {
        section.slideUp(300);
        $(`#${toggleName}-toggle-text`).text('Expandir');
    } else {
        section.slideDown(300);
        $(`#${toggleName}-toggle-text`).text('Recolher');
    }
}

function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    const button = $('#toggle-auto-refresh');
    
    if (autoRefresh) {
        button.html('<span class="text-sm">🔄 Auto: ON</span>').removeClass('bg-warning hover:bg-amber-600').addClass('bg-success hover:bg-emerald-600');
        autoRefreshInterval = setInterval(loadPlayers, 5000);
    } else {
        button.html('<span class="text-sm">🔄 Auto: OFF</span>').removeClass('bg-success hover:bg-emerald-600').addClass('bg-warning hover:bg-amber-600');
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
    }
}

function loadPlayers() {
    if (!db) {
        showNotification('Erro: Firebase não inicializado', 'error');
        return;
    }

    db.collection('players').get().then((querySnapshot) => {
        players.clear();
        querySnapshot.forEach((doc) => {
            players.set(doc.id, { id: doc.id, ...doc.data() });
        });
        
        renderPlayers();
        renderCharacterPhotos();
        updatePlayerCount();
        
    }).catch((error) => {
        console.error('Erro ao carregar jogadores:', error);
        showNotification('Erro ao carregar jogadores', 'error');
    });
}

function renderPlayers() {
    const grid = $('#players-grid');
    grid.empty();
    
    if (players.size === 0) {
        grid.html(`
            <div class="col-span-full text-center py-12">
                <div class="text-slate-400 text-6xl mb-4">👥</div>
                <p class="text-slate-500">Nenhum jogador encontrado</p>
                <button class="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600" onclick="showAddPlayerModal()">
                    ➕ Adicionar Primeiro Jogador
                </button>
            </div>
        `);
        return;
    }
    
    players.forEach(player => {
        const card = createPlayerCard(player);
        grid.append(card);
    });
}

function createPlayerCard(player) {
    const hpPercentage = player.maxHp ? (player.currentHp / player.maxHp) * 100 : 0;
    const hpColor = getHpColor(hpPercentage);
    
    const conditions = player.conditions || [];
    const conditionsHtml = conditions.length > 0 
        ? `<div class="flex flex-wrap gap-1 mt-2">
            ${conditions.map(condition => `<span class="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">${condition}</span>`).join('')}
           </div>`
        : '';
    
    return $(`
        <div class="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="font-semibold text-slate-900 text-lg">${player.name || 'Sem nome'}</h3>
                    <div class="text-sm text-slate-600">
                        <span>CA: ${player.ac || 0}</span> | 
                        <span>Init: ${player.initiative || 0}</span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="text-slate-400 hover:text-primary text-sm" onclick="editPlayer('${player.id}')">✏️</button>
                    <button class="text-slate-400 hover:text-danger text-sm" onclick="deletePlayer('${player.id}')">🗑️</button>
                </div>
            </div>
            
            <!-- HP Bar -->
            <div class="mb-3">
                <div class="flex justify-between text-sm text-slate-600 mb-1">
                    <span>HP</span>
                    <span>${player.currentHp || 0}/${player.maxHp || 0}</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2">
                    <div class="${hpColor} h-2 rounded-full transition-all duration-300" style="width: ${hpPercentage}%"></div>
                </div>
            </div>
            
            <!-- Status Bars -->
            <div class="grid grid-cols-3 gap-2 mb-3">
                <div>
                    <div class="text-xs text-slate-600 mb-1">Blight</div>
                    <div class="w-full bg-slate-200 rounded-full h-1.5">
                        <div class="${getStatusColor(player.blight || 0)} h-1.5 rounded-full" style="width: ${player.blight || 0}%"></div>
                    </div>
                    <div class="text-xs text-slate-500 text-center">${player.blight || 0}%</div>
                </div>
                <div>
                    <div class="text-xs text-slate-600 mb-1">Rejeição</div>
                    <div class="w-full bg-slate-200 rounded-full h-1.5">
                        <div class="${getStatusColor(player.rejection || 0)} h-1.5 rounded-full" style="width: ${player.rejection || 0}%"></div>
                    </div>
                    <div class="text-xs text-slate-500 text-center">${player.rejection || 0}%</div>
                </div>
                <div>
                    <div class="text-xs text-slate-600 mb-1">Neural</div>
                    <div class="w-full bg-slate-200 rounded-full h-1.5">
                        <div class="${getNeuralColor(player.neural || 0)} h-1.5 rounded-full" style="width: ${player.neural || 0}%"></div>
                    </div>
                    <div class="text-xs text-slate-500 text-center">${player.neural || 0}%</div>
                </div>
            </div>
            
            ${conditionsHtml}
        </div>
    `);
}

function renderCharacterPhotos() {
    const container = $('#character-photos');
    container.empty();
    
    if (players.size === 0) {
        container.html(`
            <div class="col-span-full text-center py-8">
                <div class="text-slate-400 text-4xl mb-2">📸</div>
                <p class="text-slate-500 text-sm">Nenhum personagem</p>
            </div>
        `);
        return;
    }
    
    players.forEach(player => {
        const photo = createCharacterPhoto(player);
        container.append(photo);
    });
}

function createCharacterPhoto(player) {
    const hpPercentage = player.maxHp ? (player.currentHp / player.maxHp) * 100 : 0;
    const hpColor = getHpColor(hpPercentage);
    
    const photoSrc = player.photoUrl || '';
    const photoContent = photoSrc 
        ? `<img src="${photoSrc}" alt="${player.name}" class="w-full h-full object-cover">`
        : `<div class="text-slate-400 text-2xl">👤</div>`;
    
    return $(`
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div class="aspect-square bg-slate-100 flex items-center justify-center relative">
                ${photoContent}
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white p-2">
                    <div class="text-xs font-medium text-center mb-1">${player.name || 'Sem nome'}</div>
                    <div class="w-full bg-slate-600 rounded-full h-1">
                        <div class="${hpColor} h-1 rounded-full" style="width: ${hpPercentage}%"></div>
                    </div>
                    <div class="text-xs text-center mt-1">${player.currentHp || 0}/${player.maxHp || 0}</div>
                </div>
            </div>
        </div>
    `);
}

function getHpColor(percentage) {
    if (percentage <= 25) return 'bg-danger';
    if (percentage <= 50) return 'bg-warning';
    return 'bg-success';
}

function getStatusColor(percentage) {
    if (percentage <= 30) return 'bg-success';
    if (percentage <= 60) return 'bg-warning';
    return 'bg-danger';
}

function getNeuralColor(percentage) {
    if (percentage <= 30) return 'bg-info';
    if (percentage <= 60) return 'bg-primary';
    return 'bg-danger';
}

function updatePlayerCount() {
    $('#player-count').text(`${players.size} jogador${players.size !== 1 ? 'es' : ''}`);
}

function showAddPlayerModal() {
    clearModalFields();
    $('#player-edit-modal').removeClass('hidden').fadeIn(200);
}

function editPlayer(playerId) {
    const player = players.get(playerId);
    if (!player) return;
    
    $('#edit-name').val(player.name || '');
    $('#edit-current-hp').val(player.currentHp || '');
    $('#edit-max-hp').val(player.maxHp || '');
    $('#edit-blight').val(player.blight || '');
    $('#edit-rejection').val(player.rejection || '');
    $('#edit-neural').val(player.neural || '');
    $('#edit-ac').val(player.ac || '');
    $('#edit-initiative').val(player.initiative || '');
    
    // Set photo preview
    if (player.photoUrl) {
        $('#photo-preview').html(`<img src="${player.photoUrl}" class="w-full h-full object-cover rounded-lg">`);
    } else {
        $('#photo-preview').html('👤');
    }
    
    // Set conditions
    renderConditions(player.conditions || []);
    
    $('#player-edit-modal').data('editing', playerId).removeClass('hidden').fadeIn(200);
}

function savePlayer() {
    const playerId = $('#player-edit-modal').data('editing');
    const isEditing = !!playerId;
    
    const playerData = {
        name: $('#edit-name').val() || 'Sem nome',
        currentHp: parseInt($('#edit-current-hp').val()) || 0,
        maxHp: parseInt($('#edit-max-hp').val()) || 0,
        blight: parseInt($('#edit-blight').val()) || 0,
        rejection: parseInt($('#edit-rejection').val()) || 0,
        neural: parseInt($('#edit-neural').val()) || 0,
        ac: parseInt($('#edit-ac').val()) || 0,
        initiative: parseInt($('#edit-initiative').val()) || 0,
        conditions: getCurrentConditions(),
        photoUrl: $('#photo-preview img').attr('src') || '',
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const promise = isEditing 
        ? db.collection('players').doc(playerId).update(playerData)
        : db.collection('players').add(playerData);
    
    promise.then(() => {
        showNotification(isEditing ? 'Jogador atualizado!' : 'Jogador adicionado!', 'success');
        closeModal();
        loadPlayers();
    }).catch(error => {
        console.error('Erro ao salvar jogador:', error);
        showNotification('Erro ao salvar jogador', 'error');
    });
}

function deletePlayer(playerId) {
    if (!confirm('Tem certeza que deseja excluir este jogador?')) return;
    
    db.collection('players').doc(playerId).delete().then(() => {
        showNotification('Jogador excluído!', 'success');
        loadPlayers();
    }).catch(error => {
        console.error('Erro ao excluir jogador:', error);
        showNotification('Erro ao excluir jogador', 'error');
    });
}

function closeModal() {
    $('#player-edit-modal').fadeOut(200, function() {
        $(this).addClass('hidden').removeData('editing');
    });
    clearModalFields();
}

function clearModalFields() {
    $('#edit-name, #edit-current-hp, #edit-max-hp, #edit-blight, #edit-rejection, #edit-neural, #edit-ac, #edit-initiative').val('');
    $('#photo-preview').html('👤');
    $('#conditions-container').empty();
    $('#condition-select').val('');
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Arquivo muito grande. Máximo 2MB.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        $('#photo-preview').html(`<img src="${e.target.result}" class="w-full h-full object-cover rounded-lg">`);
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    $('#photo-preview').html('👤');
    $('#photo-upload').val('');
}

function addCondition() {
    const condition = $('#condition-select').val();
    if (!condition) return;
    
    const conditions = getCurrentConditions();
    if (!conditions.includes(condition)) {
        conditions.push(condition);
        renderConditions(conditions);
        $('#condition-select').val('');
    }
}

function removeCondition(condition) {
    const conditions = getCurrentConditions().filter(c => c !== condition);
    renderConditions(conditions);
}

function getCurrentConditions() {
    return $('#conditions-container .condition-tag').map(function() {
        return $(this).data('condition');
    }).get();
}

function renderConditions(conditions) {
    const container = $('#conditions-container');
    container.empty();
    
    conditions.forEach(condition => {
        container.append(`
            <div class="condition-tag flex justify-between items-center bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm" data-condition="${condition}">
                <span>${condition}</span>
                <button type="button" class="text-slate-500 hover:text-danger ml-2" onclick="removeCondition('${condition}')">×</button>
            </div>
        `);
    });
}

// Session Timer Functions
function startTimer() {
    if (!sessionTimer.isRunning) {
        sessionTimer.startTime = Date.now() - sessionTimer.elapsed;
        sessionTimer.isRunning = true;
        sessionTimer.interval = setInterval(updateTimer, 1000);
    }
}

function pauseTimer() {
    if (sessionTimer.isRunning) {
        sessionTimer.isRunning = false;
        clearInterval(sessionTimer.interval);
    }
}

function resetTimer() {
    sessionTimer.isRunning = false;
    sessionTimer.elapsed = 0;
    sessionTimer.startTime = null;
    if (sessionTimer.interval) {
        clearInterval(sessionTimer.interval);
    }
    $('#session-timer').text('00:00:00');
}

function updateTimer() {
    if (sessionTimer.isRunning) {
        sessionTimer.elapsed = Date.now() - sessionTimer.startTime;
        const totalSeconds = Math.floor(sessionTimer.elapsed / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        $('#session-timer').text(
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
    }
}

function rollInitiative() {
    if (players.size === 0) {
        showNotification('Nenhum jogador para rolar iniciativa', 'warning');
        return;
    }
    
    const initiatives = [];
    players.forEach(player => {
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + (player.initiative || 0);
        initiatives.push({
            name: player.name || 'Sem nome',
            roll: roll,
            modifier: player.initiative || 0,
            total: total
        });
    });
    
    initiatives.sort((a, b) => b.total - a.total);
    
    const initiativeList = $('#initiative-list');
    initiativeList.empty();
    
    initiatives.forEach((init, index) => {
        initiativeList.append(`
            <div class="flex justify-between text-sm p-2 ${index === 0 ? 'bg-slate-100 rounded font-semibold' : ''}">
                <span>${init.name}</span>
                <span>${init.total} (${init.roll}+${init.modifier})</span>
            </div>
        `);
    });
}

function saveNotes() {
    const notes = $('#gm-notes').val();
    localStorage.setItem('gm-notes', notes);
}

function loadNotes() {
    const notes = localStorage.getItem('gm-notes') || '';
    $('#gm-notes').val(notes);
}

function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    };
    
    const notification = $(`
        <div class="notification ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform">
            ${message}
        </div>
    `);
    
    $('#notifications-container').append(notification);
    
    setTimeout(() => {
        notification.removeClass('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.addClass('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Make functions globally available
window.editPlayer = editPlayer;
window.deletePlayer = deletePlayer;
window.removeCondition = removeCondition;
window.showAddPlayerModal = showAddPlayerModal;
