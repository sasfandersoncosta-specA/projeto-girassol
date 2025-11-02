// c:/Users/Anderson/Desktop/Girassol-web/config.js

/**
 * Define a URL base da API com base no ambiente (desenvolvimento ou produção).
 * Isso centraliza a configuração e evita ter URLs fixas no código.
 */
const API_BASE_URL = (() => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001'; // URL para desenvolvimento local
  }
  // Em produção (Render, etc.), usa a origem exata da janela (ex: https://meusite.com).
  // Isso evita problemas de conteúdo misto (http vs https).
  return window.location.origin;
})();