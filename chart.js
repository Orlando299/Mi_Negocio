// ═══════════════════════════════════════════════════════════════
// CHART.JS - Gráfico de ventas semanal (archivo separado)
// Incluir en index.html: <script src="js/chart.js"></script>
// ═══════════════════════════════════════════════════════════════

let chartVentasInstance = null;

function renderChartVentas() {
  const ctx = document.getElementById('chart-ventas');
  if (!ctx) return;

  // Forzar altura del canvas
  ctx.style.height = '220px';
  ctx.style.maxHeight = '220px';

  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() + diffLunes);
  inicioSemana.setHours(0, 0, 0, 0);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6);
  finSemana.setHours(23, 59, 59, 999);

  const diasLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const totales = [0, 0, 0, 0, 0, 0, 0];

  (window.ventas || []).forEach(v => {
    if (v.status !== 'pagado' || !v.fecha) return;
    try {
      const f = new Date(v.fecha);
      if (f >= inicioSemana && f <= finSemana) {
        const ds = f.getDay();
        const idx = ds === 0 ? 6 : ds - 1;
        totales[idx] += parseCurrency(v.total);
      }
    } catch (e) {}
  });

  const diaHoy = diaSemana === 0 ? 6 : diaSemana - 1;
  const bgColors = totales.map((_, i) => {
    return i === diaHoy ? '#00338D' : 'rgba(0, 51, 141, 0.25)';
  });

  const maxVal = Math.max(...totales, 1);
  const stepSize = maxVal <= 10 ? 2 : maxVal <= 50 ? 10 : maxVal <= 100 ? 20 : Math.ceil(maxVal / 5);

  if (chartVentasInstance) {
    chartVentasInstance.destroy();
  }

  chartVentasInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: diasLabels,
      datasets: [{
        label: 'Ventas',
        data: totales,
        backgroundColor: bgColors,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 24,
        maxBarThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 10, bottom: 0, left: 0, right: 10 }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            title: (items) => items[0].label,
            label: (ctx) => 'Ventas: $' + ctx.raw.toFixed(2)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: maxVal * 1.2,
          ticks: {
            stepSize: stepSize,
            callback: (v) => {
              if (v >= 1000) return '$' + (v/1000).toFixed(1) + 'k';
              return '$' + v.toFixed(0);
            },
            font: { size: 11, family: 'Inter' },
            color: '#6B7280',
            padding: 8
          },
          grid: {
            color: 'rgba(0,0,0,0.06)',
            drawBorder: false
          },
          border: { display: false }
        },
        x: {
          grid: { display: false, drawBorder: false },
          ticks: {
            font: { size: 12, weight: '600', family: 'Inter' },
            color: '#374151',
            padding: 8
          },
          border: { display: false }
        }
      },
      animation: {
        duration: 700,
        easing: 'easeOutQuart'
      }
    }
  });
}

// Exponer globalmente
window.renderChartVentas = renderChartVentas;
