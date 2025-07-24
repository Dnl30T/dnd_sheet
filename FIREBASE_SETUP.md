# Sistema de Personagens D&D com Firebase

Este sistema permite criar, salvar e compartilhar fichas de personagem D&D online usando Firebase.

## 🚀 Configuração do Firebase

### 1. Criar um projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite o nome do projeto (ex: "dnd-character-sheets")
4. Siga as instruções para criar o projeto

### 2. Configurar Realtime Database

1. No painel do Firebase, vá em "Realtime Database"
2. Clique em "Criar banco de dados"
3. Escolha o local do servidor
4. Comece em "modo de teste" (pode alterar depois)

### 3. Obter configurações do Firebase

1. Vá em "Configurações do projeto" (ícone de engrenagem)
2. Na aba "Geral", role até "Seus aplicativos"
3. Clique em "Aplicativo da Web" (ícone </>)
4. Registre o aplicativo com um nome
5. Copie as configurações mostradas

### 4. Configurar o arquivo firebase-config.js

Abra o arquivo `firebase-config.js` e substitua os valores de exemplo pelas suas configurações:

```javascript
const firebaseConfig = {
    apiKey: "sua-api-key-aqui",
    authDomain: "seu-projeto.firebaseapp.com", 
    databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "sua-app-id"
};
```

## 🌐 Como Funciona

### Para os Jogadores

1. **Criar Personagem**: Preencha os dados na ficha
2. **Salvar**: Clique em "SALVAR FICHA" - será gerado automaticamente um link único
3. **Compartilhar**: O link será copiado automaticamente para área de transferência
4. **Acessar**: Use o link no formato `/personagens/[nome-do-personagem]`

### URLs dos Personagens

- Formato: `https://seusite.com/personagens/nome-do-personagem`
- O nome é automaticamente formatado (caracteres especiais removidos, espaços vira hífens)
- Exemplo: "Aragorn Filho de Arathorn" → `/personagens/aragorn-filho-de-arathorn`

## 📋 Funcionalidades

### ✅ Implementadas

- ✅ Salvamento automático no Firebase
- ✅ URLs amigáveis para cada personagem
- ✅ Página de visualização somente leitura
- ✅ Lista de todos os personagens salvos
- ✅ Backup local no localStorage
- ✅ Cópia automática do link para área de transferência
- ✅ Sistema de loading e tratamento de erros

### 🔄 Em Desenvolvimento

- 🔄 Sistema de autenticação (opcional)
- 🔄 Permissões de edição
- 🔄 Histórico de versões
- 🔄 Exportação para PDF melhorada

## 🛠️ Configuração do Servidor

### Apache (.htaccess)

O arquivo `.htaccess` já está configurado para:
- Redirecionamento de URLs amigáveis
- Cache de arquivos estáticos
- Configurações de MIME type

### Nginx

Se usar Nginx, adicione estas regras:

```nginx
location /personagens/ {
    try_files $uri $uri/ /personagens/index.html;
}

location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1M;
    add_header Cache-Control "public, immutable";
}
```

## 🔧 Solução de Problemas

### Firebase não conecta

1. Verifique se as configurações em `firebase-config.js` estão corretas
2. Confirme se o Realtime Database está ativado
3. Verifique as regras de segurança do banco:

```json
{
  "rules": {
    ".read": "true",
    ".write": "true"
  }
}
```

### URLs não funcionam

1. Verifique se o arquivo `.htaccess` está no diretório correto
2. Confirme se o mod_rewrite está ativado no Apache
3. Teste se o arquivo `/personagens/index.html` existe

### Personagem não carrega

1. Verifique o console do navegador para erros
2. Confirme se o nome do personagem existe no Firebase
3. Teste com um personagem conhecido

## 📱 Compatibilidade

- ✅ Navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✅ Responsivo para mobile e tablet
- ✅ Funciona offline (dados locais)
- ✅ PWA-ready (pode ser adicionado à tela inicial)

## 🎯 Exemplos de Uso

### URL de Exemplo
```
https://meusite.com/personagens/gandalf-o-cinzento
```

### Compartilhamento
Quando um jogador salva o personagem "Gandalf o Cinzento", o sistema:
1. Formata o nome: `gandalf-o-cinzento`
2. Salva no Firebase
3. Gera a URL: `/personagens/gandalf-o-cinzento`
4. Copia o link para área de transferência
5. Mostra notificação com o link

## 🔐 Segurança

### Recomendações para Produção

1. **Regras do Firebase**: Configure regras mais restritivas
2. **Autenticação**: Implemente login se necessário
3. **Rate Limiting**: Configure limites de requisições
4. **Backup**: Configure backup automático do banco

### Regras Sugeridas para Firebase

```json
{
  "rules": {
    "characters": {
      "$characterId": {
        ".read": "true",
        ".write": "true",
        ".validate": "newData.hasChildren(['name', 'lastUpdated'])"
      }
    }
  }
}
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique o console do navegador
2. Confirme as configurações do Firebase
3. Teste com dados de exemplo
4. Verifique a conectividade com a internet

---

**Versão**: 1.0.0  
**Última atualização**: Dezembro 2024
