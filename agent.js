// js/agent.js - Versión sin config.js
// La clave se establece manualmente en el navegador

// Variable global para la clave (se establece desde la consola o desde un script inline)
let DEEPSEEK_API_KEY = '';

// Función para establecer la clave manualmente (llámalo desde la consola)
function setDeepSeekKey(key) {
  DEEPSEEK_API_KEY = key;
  console.log('✅ Clave de DeepSeek establecida');
}

async function llamarDeepSeek(prompt) {
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠️ API Key no configurada. Usa setDeepSeekKey("sk-...") en la consola.');
    return '⚠️ El asistente no está disponible. Contacta al administrador.';
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente experto en gestión de franquicias Polar. 
            Tu nombre es "PolarBot". Responde siempre en español, de forma clara y concisa.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 250,
        temperature: 0.3
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ Error:', error);
    return '⚠️ Error al procesar la consulta.';
  }
}

// Exponer funciones
window.setDeepSeekKey = setDeepSeekKey;
window.llamarDeepSeek = llamarDeepSeek;
window.agentCommand = async function(comando) {
  // ... lógica igual que antes, pero usando DEEPSEEK_API_KEY
};
