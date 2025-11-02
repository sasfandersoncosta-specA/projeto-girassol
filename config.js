// c:/Users/Anderson/Desktop/Girassol-web/config.js

/**
 * Define a URL base da API com base no ambiente (desenvolvimento ou produção).
 * Isso centraliza a configuração e evita ter URLs fixas no código.
 */
const API_BASE_URL = (() => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001'; // URL para desenvolvimento local
  }
  // Em produção (Render, etc.), retorne uma string VAZIA.
  // Isso forçará o fetch() a usar caminhos relativos (ex: /api/...),
  // que é o método mais robusto e à prova de falhas.
  return '';
})();