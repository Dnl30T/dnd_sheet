// Configuração do Firebase
// Substitua pelos seus dados do Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyARSykuZFgVtH-S1JX1k58CgC1OKBLBvdM",
    authDomain: "dndsheet-2b865.firebaseapp.com",
    projectId: "dndsheet-2b865",
    storageBucket: "dndsheet-2b865.firebasestorage.app",
    messagingSenderId: "660045034554",
    appId: "1:660045034554:web:5c017a7b999150048bf103",
    measurementId: "G-50N0WMT2BB"
};


// Inicializar Firebase
console.log('🔧 Iniciando Firebase com Firestore...');
console.log('📋 Configuração:', firebaseConfig);

try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
}

// Referências do Firestore
const db = firebase.firestore();
const charactersCollection = db.collection('characters');

// Teste de conexão inicial para Firestore
console.log('🔍 Testando conexão com Firestore...');

// Para Firestore, vamos fazer um teste simples
db.enableNetwork().then(() => {
    console.log('✅ Conectado ao Firebase Firestore!');
    
    // Mostrar notificação visual se a função existir
    if (typeof showNotification === 'function') {
        showNotification('Firebase Firestore conectado com sucesso!', 'success');
    }
    
    // Adicionar indicador visual na página
    addFirebaseStatusIndicator(true);
}).catch((error) => {
    console.error('❌ Erro ao conectar com Firestore:', error);
    
    if (typeof showNotification === 'function') {
        showNotification('Firebase Firestore offline - usando dados locais', 'warning');
    }
    
    addFirebaseStatusIndicator(false);
});

// Função para adicionar indicador visual de status
function addFirebaseStatusIndicator(connected) {
    // Verificar se jQuery está disponível
    if (typeof $ === 'undefined') {
        console.log('⚠️ jQuery não está disponível ainda, pulando indicador visual');
        return;
    }
    
    // Remove indicador existente
    $('#firebase-status').remove();
    
    const statusHtml = `
        <div id="firebase-status" class="fixed top-4 right-4 z-50 px-3 py-2 rounded-md text-sm font-medium ${
            connected 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
        }">
            <span class="mr-2">${connected ? '🟢' : '🟡'}</span>
            Firestore: ${connected ? 'Conectado' : 'Offline'}
        </div>
    `;
    
    $('body').append(statusHtml);
    
    // Auto-remover após 5 segundos se conectado
    if (connected) {
        setTimeout(() => {
            $('#firebase-status').fadeOut();
        }, 5000);
    }
}

// Utilitários do Firestore
const FirebaseUtils = {
    // Salvar personagem no Firestore
    async saveCharacter(characterData) {
        console.log('💾 Tentando salvar personagem no Firestore:', characterData.name);
        console.log('📊 Dados completos:', characterData);
        
        try {
            if (!characterData.name || characterData.name.trim() === '') {
                throw new Error('Nome do personagem é obrigatório');
            }

            const characterKey = this.sanitizeKey(characterData.name);
            console.log('🔑 Chave sanitizada:', characterKey);
            
            // Adicionar timestamp
            characterData.lastUpdated = firebase.firestore.Timestamp.now();
            characterData.created = characterData.created || firebase.firestore.Timestamp.now();
            
            console.log('📡 Enviando para Firestore...');
            await charactersCollection.doc(characterKey).set(characterData);
            console.log('✅ Personagem salvo no Firestore com sucesso!');
            
            // Salvar no localStorage também como backup
            localStorage.setItem('dnd-character-data', JSON.stringify(characterData));
            console.log('💽 Backup salvo no localStorage');
            
            const url = this.getCharacterUrl(characterKey);
            console.log('🔗 URL gerada:', url);
            
            return {
                success: true,
                message: 'Personagem salvo com sucesso!',
                url: url
            };
        } catch (error) {
            console.error('❌ Erro ao salvar personagem:', error);
            console.error('📋 Stack trace:', error.stack);
            return {
                success: false,
                message: 'Erro ao salvar personagem: ' + error.message
            };
        }
    },

    // Carregar personagem do Firestore
    async loadCharacter(characterName) {
        console.log('📖 Tentando carregar personagem do Firestore:', characterName);
        
        try {
            const characterKey = this.sanitizeKey(characterName);
            console.log('🔑 Chave sanitizada para busca:', characterKey);
            
            console.log('📡 Buscando no Firestore...');
            const doc = await charactersCollection.doc(characterKey).get();
            
            if (doc.exists) {
                const data = doc.data();
                console.log('✅ Personagem encontrado!');
                console.log('📊 Dados carregados:', data);
                
                // Converter timestamps para formato legível
                if (data.lastUpdated && data.lastUpdated.toDate) {
                    data.lastUpdated = data.lastUpdated.toDate().getTime();
                }
                if (data.created && data.created.toDate) {
                    data.created = data.created.toDate().getTime();
                }
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.log('❌ Personagem não encontrado no Firestore');
                return {
                    success: false,
                    message: 'Personagem não encontrado'
                };
            }
        } catch (error) {
            console.error('❌ Erro ao carregar personagem:', error);
            console.error('📋 Stack trace:', error.stack);
            return {
                success: false,
                message: 'Erro ao carregar personagem: ' + error.message
            };
        }
    },

    // Listar todos os personagens do Firestore
    async listCharacters() {
        console.log('📋 Listando todos os personagens do Firestore...');
        
        try {
            console.log('📡 Buscando lista no Firestore...');
            const querySnapshot = await charactersCollection.orderBy('lastUpdated', 'desc').get();
            const characters = [];
            
            if (!querySnapshot.empty) {
                console.log('📊 Dados encontrados, processando...');
                
                querySnapshot.forEach((doc) => {
                    const character = doc.data();
                    const characterInfo = {
                        key: doc.id,
                        name: character.name,
                        classLevel: character.classLevel,
                        lastUpdated: character.lastUpdated ? character.lastUpdated.toDate().getTime() : Date.now(),
                        url: this.getCharacterUrl(doc.id)
                    };
                    
                    characters.push(characterInfo);
                    console.log('👤 Personagem adicionado:', characterInfo);
                });
                
                console.log(`✅ Total de ${characters.length} personagens encontrados`);
                
                return {
                    success: true,
                    data: characters
                };
            } else {
                console.log('📭 Nenhum personagem encontrado no Firestore');
                return {
                    success: true,
                    data: []
                };
            }
        } catch (error) {
            console.error('❌ Erro ao listar personagens:', error);
            console.error('📋 Stack trace:', error.stack);
            return {
                success: false,
                message: 'Erro ao listar personagens: ' + error.message
            };
        }
    },

    // Limpar nome do personagem para usar como chave
    sanitizeKey(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    },

    // Gerar URL do personagem
    getCharacterUrl(characterKey) {
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        return `${baseUrl}/personagens/${characterKey}`;
    },

    // Verificar se personagem existe no Firestore
    async characterExists(characterName) {
        console.log('🔍 Verificando se personagem existe no Firestore:', characterName);
        
        try {
            const characterKey = this.sanitizeKey(characterName);
            console.log('🔑 Chave para verificação:', characterKey);
            
            const doc = await charactersCollection.doc(characterKey).get();
            const exists = doc.exists;
            
            console.log(exists ? '✅ Personagem existe' : '❌ Personagem não existe');
            return exists;
        } catch (error) {
            console.error('❌ Erro ao verificar personagem:', error);
            return false;
        }
    },

    // Função de teste completo do Firestore
    async testFirebaseConnection() {
        console.log('🧪 === TESTE COMPLETO DO FIRESTORE ===');
        
        try {
            // 0. Verificar se o Firestore está configurado
            console.log('0️⃣ Verificando configuração do Firestore...');
            if (!firebaseConfig.projectId) {
                throw new Error('projectId não configurado no firebaseConfig');
            }
            console.log('✅ projectId configurado:', firebaseConfig.projectId);
            
            // 1. Teste de conectividade básica
            console.log('1️⃣ Testando conectividade básica do Firestore...');
            const testDoc = db.collection('test').doc('connection-test');
            await testDoc.set({ 
                timestamp: firebase.firestore.Timestamp.now(), 
                test: true 
            });
            console.log('✅ Escrita de teste bem-sucedida no Firestore');
            
            // 2. Teste de leitura
            console.log('2️⃣ Testando leitura...');
            const doc = await testDoc.get();
            if (doc.exists) {
                console.log('✅ Leitura de teste bem-sucedida:', doc.data());
            }
            
            // 3. Limpar teste
            await testDoc.delete();
            console.log('✅ Limpeza de teste concluída');
            
            // 4. Teste da coleção de personagens
            console.log('3️⃣ Testando coleção de personagens...');
            const charactersSnapshot = await charactersCollection.get();
            const count = charactersSnapshot.size;
            console.log(`✅ Coleção OK - ${count} personagens na base`);
            
            // 5. Teste de permissões
            console.log('4️⃣ Testando permissões...');
            const permissionTest = db.collection('permission-test').doc('test');
            await permissionTest.set({ test: true });
            await permissionTest.delete();
            console.log('✅ Permissões OK - pode ler e escrever no Firestore');
            
            console.log('🎉 === TODOS OS TESTES DO FIRESTORE PASSARAM ===');
            
            if (typeof showNotification === 'function') {
                showNotification('Firestore: Todos os testes passaram! 🎉', 'success');
            }
            
            return true;
        } catch (error) {
            console.error('❌ === TESTE DO FIRESTORE FALHOU ===');
            console.error('Erro:', error.message);
            console.error('Detalhes:', error);
            
            // Diagnósticos específicos para Firestore
            if (error.message.includes('projectId')) {
                console.error('🔧 SOLUÇÃO: Verifique se projectId está correto na configuração');
            } else if (error.message.includes('permission') || error.code === 'permission-denied') {
                console.error('🔧 SOLUÇÃO: Configure as regras de segurança do Firestore');
                console.error('📋 Regras sugeridas para teste:');
                console.error('rules_version = "2";');
                console.error('service cloud.firestore {');
                console.error('  match /databases/{database}/documents {');
                console.error('    match /{document=**} {');
                console.error('      allow read, write: if true;');
                console.error('    }');
                console.error('  }');
                console.error('}');
            } else if (error.message.includes('network') || error.code === 'unavailable') {
                console.error('🔧 SOLUÇÃO: Verifique sua conexão com a internet');
            } else if (error.code === 'not-found') {
                console.error('🔧 SOLUÇÃO: Verifique se o Firestore está habilitado no projeto');
            }
            
            if (typeof showNotification === 'function') {
                showNotification('Firestore: Teste falhou - ' + error.message, 'error');
            }
            
            return false;
        }
    }
};

// Executar teste automático após 3 segundos (aumentado para dar tempo do jQuery carregar)
setTimeout(() => {
    console.log('⏰ Executando teste automático do Firestore...');
    FirebaseUtils.testFirebaseConnection();
}, 3000);

// Adicionar função de teste manual no objeto window para debug no console
window.testFirebase = () => {
    console.log('🔧 Executando teste manual do Firestore...');
    return FirebaseUtils.testFirebaseConnection();
};

// Exportar para uso global
window.FirebaseUtils = FirebaseUtils;

// Log final
console.log('🔧 Firebase-config.js carregado completamente para Firestore!');
console.log('💡 Use testFirebase() no console para testar manualmente');
console.log('📋 Se der erro de permissão, configure as regras do Firestore para:');
console.log(`rules_version = "2";
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`);
