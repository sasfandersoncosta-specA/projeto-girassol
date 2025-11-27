// Verificamos automaticamente onde o site está rodando
const isLocalhost = window.location.hostname.includes("localhost") || 
                    window.location.hostname.includes("127.0.0.1");

// Se for local, usa localhost. Se não, usa o link do Render.
const API_BASE_URL = isLocalhost 
    ? "http://localhost:3001" 
    : "https://projeto-girassol.onrender.com"; 

console.log("Ambiente detectado:", isLocalhost ? "Local" : "Produção (Render)");
console.log("API configurada para:", API_BASE_URL);