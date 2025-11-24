// IMPORTANTE: Este arquivo deve ser carregado no HTML ANTES de qualquer outro script.

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://localhost:3001'  // Seu Backend Local
    : 'https://projeto-girassol.onrender.com/'; 

console.log(`[Jano Config] Ambiente detectado: ${window.location.hostname}. API definida para: ${API_BASE_URL}`);

// Função auxiliar para toast de erro global
window.showGlobalError = (msg) => {
    alert("Erro no Sistema: " + msg); // Pode substituir por um toast bonito depois
};