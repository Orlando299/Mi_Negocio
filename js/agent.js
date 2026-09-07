// ================================================================
//  AGENT.JS - POLARBOT (FASE 4 COMPLETA)
//  Incluye: caché, límite diario, burbujas, historial Firestore, voz, notificaciones
// ================================================================

let DEEPSEEK_API_KEY = '';
let recognition = null;

// ── CONFIGURACIÓN DE VOZ ──
function iniciarVoz() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('⚠️ Tu navegador no soporta comandos de voz');
    return;
  }
  
  if (!recognition) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = function(event) {
      const resultado = event.results[0][0].transcript;
      document.getElementById('agent-input').value = resultado;
      sendAgentCommand();
    };
    
    recognition.onerror = function(event) {
      showToast('⚠️ Error de voz: ' + event.error);
    };
  }
  
  recognition.start();
  showToast('🎤 Escuchando...');
}

// ── FUNCIÓN PARA GUARDAR HISTORIAL EN FIRESTORE ──
async function guardarHistorialAgente(empresaId, pregunta, respuesta) {
  if (!empresaId) return;
  try {
    await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('agentHistory')
      .add({
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        usuario: sessionStorage.getItem('userName') || 'Usuario',
        pregunta: pregunta,
        respuesta: respuesta,
        tipo: 'interaccion'
      });
  } catch (error) {
    console.warn('⚠️ Error guardando historial:', error);
  }
}

// ── FUNCIÓN PARA CARGAR HISTORIAL AL ABRIR EL PANEL ──
async function cargarHistorialAgente(empresaId) {
  if (!empresaId) return;
  try {
    const snapshot = await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .collection('agentHistory')
      .orderBy('fecha', 'desc')
      .limit(20)
      .get();
    
    if (snapshot.empty) return;
    
    const historial = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      historial.push({
        pregunta: data.pregunta,
        respuesta: data.respuesta,
        fecha: data.fecha?.toDate?.() || new Date(data.fecha)
      });
    });
    historial.reverse();
    historial.forEach(item => {
      appendMessage('usuario', item.pregunta);
      appendMessage('agente', item.respuesta);
    });
  } catch (error) {
    console.warn('⚠️ Error cargando historial:', error);
  }
}

// ── FUNCIÓN PARA AGREGAR BURBUJA DE MENSAJE ──
function appendMessage(rol, texto) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const bubble = document.createElement('div');
  bubble.style.display = 'flex';
  bubble.style.justifyContent = rol === 'usuario' ? 'flex-end' : 'flex-start';
  bubble.style.marginBottom = '8px';
  
  const bubbleInner = document.createElement('div');
  bubbleInner.style.maxWidth = '80%';
  bubbleInner.style.padding = '8px 14px';
  bubbleInner.style.borderRadius = '16px';
  bubbleInner.style.wordWrap = 'break-word';
  bubbleInner.style.fontSize = '14px';
  
  if (rol === 'usuario') {
    bubbleInner.style.background = 'var(--primary)';
    bubbleInner.style.color = 'white';
    bubbleInner.style.borderBottomRightRadius = '4px';
  } else {
    bubbleInner.style.background = 'var(--surface2)';
    bubbleInner.style.color = 'var(--text)';
    bubbleInner.style.borderBottomLeftRadius = '4px';
    bubbleInner.style.border = '1px solid var(--border)';
  }
  
  // Procesar saltos de línea
  bubbleInner.innerHTML = texto.replace(/\n/g, '<br>');
  
  bubble.appendChild(bubbleInner);
  container.appendChild(bubble);
  
  // Scroll al final
  const containerScroll = document.getElementById('chat-messages-container');
  if (containerScroll) {
    containerScroll.scrollTop = containerScroll.scrollHeight;
  }
}

// ── NOTIFICACIÓN DEL SISTEMA (Tarea 5) ──
function notificarRespuesta(mensaje) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('🤖 PolarBot', {
      body: mensaje,
      icon: 'https://orlando299.github.io/Mi_Negocio/favicon.ico'
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// ── FUNCIÓN PARA ESTABLECER LA CLAVE ──
function setDeepSeekKey(key) {
  DEEPSEEK_API_KEY = key;
  localStorage.setItem('deepseek_api_key', key);
  console.log('✅ Clave de DeepSeek establecida');
  showToast('✅ Clave configurada correctamente');
  return 'Clave establecida.';
}

// ── SISTEMA DE CACHÉ ──
function getCachedResponse(pregunta) {
  try {
    const cache = JSON.parse(localStorage.getItem('agentCache') || '{}');
    const key = pregunta.trim().toLowerCase();
    const entry = cache[key];
    if (entry && (Date.now() - entry.timestamp < 300000)) {
      return entry.respuesta;
    }
    return null;
  } catch { return null; }
}

function setCachedResponse(pregunta, respuesta) {
  try {
    const cache = JSON.parse(localStorage.getItem('agentCache') || '{}');
    const key = pregunta.trim().toLowerCase();
    cache[key] = { respuesta, timestamp: Date.now() };
    localStorage.setItem('agentCache', JSON.stringify(cache));
  } catch {}
}

// ── SISTEMA DE CUPO DIARIO ──
async function verificarCupoDiario(empresaId) {
  if (!empresaId) return { disponible: false, usado: 0, limite: 0 };
  try {
    const doc = await firebase.firestore().collection('empresas').doc(empresaId).get();
    if (!doc.exists) return { disponible: false, usado: 0, limite: 0 };
    const data = doc.data();
    const hoy = new Date().toISOString().split('T')[0];
    const limite = 20;
    if (!data.agentUsage || data.agentUsage.fecha !== hoy) {
      await firebase.firestore().collection('empresas').doc(empresaId).set({
        agentUsage: { fecha: hoy, contador: 0 }
      }, { merge: true });
      return { disponible: true, usado: 0, limite };
    }
    const usado = data.agentUsage.contador || 0;
    return { disponible: usado < limite, usado, limite };
  } catch { return { disponible: true, usado: 0, limite: 20 }; }
}

async function incrementarCupo(empresaId) {
  if (!empresaId) return;
  try {
    const hoy = new Date().toISOString().split('T')[0];
    await firebase.firestore().collection('empresas').doc(empresaId).set({
      agentUsage: { fecha: hoy, contador: firebase.firestore.FieldValue.increment(1) }
    }, { merge: true });
  } catch {}
}

// ── LLAMADA A DEEPSEEK ──
async function llamarDeepSeek(prompt) {
  const cached = getCachedResponse(prompt);
  if (cached) return cached;

  if (!DEEPSEEK_API_KEY) {
    const saved = localStorage.getItem('deepseek_api_key');
    if (saved) DEEPSEEK_API_KEY = saved;
    else throw new Error('API Key no configurada');
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
          { role: 'system', content: 'Eres un asistente experto en gestión de franquicias Polar. Responde en español, conciso.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 250,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      let errorMsg = `Error ${response.status}`;
      try {
        const errorData = await response.json();
        if (response.status === 402) errorMsg = 'Saldo insuficiente en DeepSeek. Recarga tu cuenta.';
        else errorMsg = errorData.error?.message || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const respuesta = data.choices[0].message.content.trim();
    setCachedResponse(prompt, respuesta);
    return respuesta;
  } catch (error) {
    throw error;
  }
}

// ── COMANDO PRINCIPAL DEL AGENTE ──
async function agentCommand(comando) {
  if (!comando || comando.trim() === '') return 'ℹ️ Escribe un comando.';

  const userRol = sessionStorage.getItem('userRol');
  const esPropietario = sessionStorage.getItem('esPropietario') === 'true';
  const empresaId = sessionStorage.getItem('empresaId');

  if (userRol !== 'admin' || !esPropietario) {
    return executeManualCommand(comando);
  }

  try {
    const cupo = await verificarCupoDiario(empresaId);
    if (!cupo.disponible) {
      const manual = executeManualCommand(comando);
      return `⚠️ Has agotado tus ${cupo.limite} consultas IA de hoy.\n\n📌 ${manual}`;
    }

    const respuestaIA = await llamarDeepSeek(comando);
    await incrementarCupo(empresaId);
    const restantes = cupo.limite - cupo.usado - 1;
    return `${respuestaIA}\n\n📊 Consultas restantes hoy: ${restantes}`;
  } catch (error) {
    console.warn('Fallback a manual:', error.message);
    const manual = executeManualCommand(comando);
    return `⚠️ ${error.message}\n\n📌 ${manual}`;
  }
}

// ── FUNCIÓN PARA ENVIAR COMANDO (con burbujas, historial y notificación) ──
async function sendAgentCommand() {
  const input = document.getElementById('agent-input');
  const comando = input.value.trim();
  if (!comando) return;

  // Agregar mensaje del usuario
  appendMessage('usuario', comando);
  input.value = '';
  input.disabled = true;
  input.style.opacity = '0.6';
  
  const status = document.getElementById('agent-status');
  if (status) status.textContent = '● Pensando...';

  try {
    const respuesta = await agentCommand(comando);
    appendMessage('agente', respuesta);
    
    // Guardar en Firestore
    const empresaId = sessionStorage.getItem('empresaId');
    if (empresaId) {
      await guardarHistorialAgente(empresaId, comando, respuesta);
    }
    
    // Notificación del sistema
    notificarRespuesta(respuesta.substring(0, 100) + (respuesta.length > 100 ? '...' : ''));
    
    if (status) status.textContent = '● Listo';
  } catch (error) {
    appendMessage('agente', '❌ Error: ' + error.message);
    if (status) status.textContent = '● Error';
  } finally {
    input.disabled = false;
    input.style.opacity = '1';
    input.focus();
  }
}

// ── ABRIR/CERRAR PANEL ──
async function toggleAgentPanel() {
  const panel = document.getElementById('agent-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  
  if (!isOpen) {
    panel.style.display = 'flex';
    // Limpiar mensajes actuales y cargar historial
    const container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '';
    const empresaId = sessionStorage.getItem('empresaId');
    if (empresaId) {
      await cargarHistorialAgente(empresaId);
    }
    // Si no hay historial, mostrar mensaje de bienvenida
    if (container && container.children.length === 0) {
      appendMessage('agente', '👋 Hola, soy PolarBot. Escribe "ayuda" para ver qué puedo hacer.');
    }
  } else {
    panel.style.display = 'none';
  }
}

// ── EXPONER FUNCIONES GLOBALES ──
window.setDeepSeekKey = setDeepSeekKey;
window.llamarDeepSeek = llamarDeepSeek;
window.agentCommand = agentCommand;
window.sendAgentCommand = sendAgentCommand;
window.toggleAgentPanel = toggleAgentPanel;
window.iniciarVoz = iniciarVoz;
window.verificarCupoDiario = verificarCupoDiario;
window.incrementarCupo = incrementarCupo;
window.getCachedResponse = getCachedResponse;
window.setCachedResponse = setCachedResponse;
window.guardarHistorialAgente = guardarHistorialAgente;
window.cargarHistorialAgente = cargarHistorialAgente;
window.appendMessage = appendMessage;
window.notificarRespuesta = notificarRespuesta;

console.log('🤖 PolarBot Fase 4 cargado correctamente');
console.log('📌 Funciones: setDeepSeekKey, comandos de voz, historial, notificaciones');
