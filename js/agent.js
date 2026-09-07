// ================================================================
//  AGENT.JS - ASISTENTE POLARBOT (Fase 2 y 3)
//  Incluye: caché, límite diario, indicador de carga y contador
// ================================================================

// ── VARIABLE GLOBAL PARA LA CLAVE ──
let DEEPSEEK_API_KEY = '';

// ── FUNCIÓN PARA ESTABLECER LA CLAVE MANUALMENTE ──
function setDeepSeekKey(key) {
  DEEPSEEK_API_KEY = key;
  localStorage.setItem('deepseek_api_key', key);
  console.log('✅ Clave de DeepSeek establecida y guardada en localStorage');
  return 'Clave establecida correctamente.';
}

// ── SISTEMA DE CACHÉ ──
function getCachedResponse(pregunta) {
  try {
    const cache = JSON.parse(localStorage.getItem('agentCache') || '{}');
    const key = pregunta.trim().toLowerCase();
    const entry = cache[key];
    const CACHE_DURATION = 300000; // 5 minutos
    if (entry && (Date.now() - entry.timestamp < CACHE_DURATION)) {
      console.log('📦 Respuesta obtenida del caché');
      return entry.respuesta;
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Error leyendo caché:', error);
    return null;
  }
}

function setCachedResponse(pregunta, respuesta) {
  try {
    const cache = JSON.parse(localStorage.getItem('agentCache') || '{}');
    const key = pregunta.trim().toLowerCase();
    cache[key] = {
      respuesta: respuesta,
      timestamp: Date.now()
    };
    localStorage.setItem('agentCache', JSON.stringify(cache));
    console.log('💾 Respuesta guardada en caché');
  } catch (error) {
    console.warn('⚠️ Error guardando caché:', error);
  }
}

// ── SISTEMA DE CUPO DIARIO ──
async function verificarCupoDiario(empresaId) {
  if (!empresaId) {
    console.warn('⚠️ No hay empresaId para verificar cupo');
    return { disponible: false, usado: 0, limite: 0 };
  }

  try {
    const doc = await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .get();

    if (!doc.exists) {
      console.warn('⚠️ Empresa no encontrada');
      return { disponible: false, usado: 0, limite: 0 };
    }

    const data = doc.data();
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limite = 20; // Límite diario
    
    if (!data.agentUsage || data.agentUsage.fecha !== hoy) {
      await firebase.firestore()
        .collection('empresas')
        .doc(empresaId)
        .set({
          agentUsage: {
            fecha: hoy,
            contador: 0
          }
        }, { merge: true });
      
      return { disponible: true, usado: 0, limite };
    }

    const usado = data.agentUsage.contador || 0;
    const disponible = usado < limite;

    return { disponible, usado, limite };
  } catch (error) {
    console.error('❌ Error verificando cupo:', error);
    return { disponible: true, usado: 0, limite: 20 };
  }
}

async function incrementarCupo(empresaId) {
  if (!empresaId) return;

  try {
    const hoy = new Date().toISOString().split('T')[0];
    await firebase.firestore()
      .collection('empresas')
      .doc(empresaId)
      .set({
        agentUsage: {
          fecha: hoy,
          contador: firebase.firestore.FieldValue.increment(1)
        }
      }, { merge: true });
  } catch (error) {
    console.error('❌ Error incrementando cupo:', error);
  }
}

// ── LLAMADA A DEEPSEEK (con caché) ──
async function llamarDeepSeek(prompt) {
  // Verificar caché primero
  const cachedResponse = getCachedResponse(prompt);
  if (cachedResponse) {
    return cachedResponse;
  }

  if (!DEEPSEEK_API_KEY) {
    // Intentar recuperar de localStorage
    const savedKey = localStorage.getItem('deepseek_api_key');
    if (savedKey) {
      DEEPSEEK_API_KEY = savedKey;
      console.log('🔑 Clave recuperada de localStorage');
    } else {
      console.warn('⚠️ API Key no configurada. Usa setDeepSeekKey("sk-...") en la consola.');
      return '⚠️ El asistente no está disponible. Usa el comando "setDeepSeekKey" primero.';
    }
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
            Tu nombre es "PolarBot". Responde siempre en español, de forma clara y concisa.
            Si te preguntan por datos de negocio (ventas, inventario, clientes), 
            indica que puedes consultarlos si el usuario te da el comando específico.
            Si no entiendes una pregunta, sugiere comandos como "ventas hoy", 
            "productos agotados", "ayuda", etc.
            Responde con un máximo de 250 tokens para ser conciso.`
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error en DeepSeek API:', errorData);
      throw new Error(`Error ${response.status}: ${errorData.error?.message || 'Desconocido'}`);
    }

    const data = await response.json();
    const respuesta = data.choices[0].message.content.trim();
    
    // Guardar en caché
    setCachedResponse(prompt, respuesta);
    
    console.log('🤖 Respuesta de DeepSeek obtenida');
    return respuesta;

  } catch (error) {
    console.error('❌ Error llamando a DeepSeek:', error);
    return '⚠️ Lo siento, hubo un problema al procesar tu consulta. Intenta de nuevo más tarde.';
  }
}

// ── COMANDO PRINCIPAL DEL AGENTE (con contador de restantes) ──

async function agentCommand(comando) {
  if (!comando || comando.trim() === '') {
    return 'ℹ️ Escribe un comando. Por ejemplo: "ventas hoy" o "ayuda".';
  }

  const userRol = sessionStorage.getItem('userRol');
  const esPropietario = sessionStorage.getItem('esPropietario') === 'true';
  const empresaId = sessionStorage.getItem('empresaId');

  if (userRol !== 'admin' || !esPropietario) {
    const result = executeManualCommand(comando);
    return result;
  }

  try {
    const cupo = await verificarCupoDiario(empresaId);
    if (!cupo.disponible) {
      const result = executeManualCommand(comando);
      return `⚠️ Has agotado tus ${cupo.limite} consultas IA de hoy.\n\n📌 (Respuesta manual): ${result}`;
    }

    const respuestaIA = await llamarDeepSeek(comando);
    await incrementarCupo(empresaId);
    const restantes = cupo.limite - cupo.usado - 1;
    return `${respuestaIA}\n\n📊 Consultas restantes hoy: ${restantes}`;
  } catch (error) {
    console.warn('Fallback a manual por error en API:', error.message);
    const manual = executeManualCommand(comando);
    return `⚠️ ${error.message}\n\n📌 (Respuesta manual): ${manual}`;
  }
}

// ── FUNCIÓN PARA ENVIAR COMANDO (con indicador de carga) ──
async function sendAgentCommand() {
  const input = document.getElementById('agent-input');
  const responseDiv = document.getElementById('agent-response');
  if (!input || !responseDiv) return;

  const comando = input.value.trim();
  if (!comando) return;

  // Mostrar indicador de carga
  responseDiv.innerHTML = '⏳ Pensando...';
  input.disabled = true;
  input.style.opacity = '0.6';

  try {
    const respuesta = await agentCommand(comando);
    responseDiv.innerHTML = respuesta;
  } catch (error) {
    console.error('❌ Error en el agente:', error);
    responseDiv.innerHTML = '❌ Error al procesar tu consulta. Intenta de nuevo.';
  } finally {
    input.disabled = false;
    input.style.opacity = '1';
    input.value = '';
    input.focus();
  }
}

// ── FUNCIÓN PARA ABRIR/CERRAR EL PANEL ──
function toggleAgentPanel() {
  const panel = document.getElementById('agent-panel');
  if (panel) {
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  }
}

// ── EXPONER FUNCIONES GLOBALMENTE ──
window.setDeepSeekKey = setDeepSeekKey;
window.llamarDeepSeek = llamarDeepSeek;
window.agentCommand = agentCommand;
window.sendAgentCommand = sendAgentCommand;
window.toggleAgentPanel = toggleAgentPanel;
window.verificarCupoDiario = verificarCupoDiario;
window.incrementarCupo = incrementarCupo;
window.getCachedResponse = getCachedResponse;
window.setCachedResponse = setCachedResponse;

console.log('🤖 PolarBot cargado correctamente (Fase 2 y 3)');
console.log('📌 Para configurar la clave, escribe en la consola: setDeepSeekKey("sk-...")');
