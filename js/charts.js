/**
 * Gerenciador de gráficos do RunIQ - Versão Corrigida sem Erro de Sintaxe
 */
const RunIQCharts = {
  instances: {},

  destroyExisting(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
    }
  },

  renderFitness(canvasId, labels, ctlData, atlData, tsbData) {
    this.destroyExisting(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'CTL (Fitness)', data: ctlData, borderColor: '#3b82f6', borderWidth: 2, radius: 0, fill: false },
          { label: 'ATL (Fadiga)', data: atlData, borderColor: '#ef4444', borderWidth: 1.5, radius: 0, fill: false },
          { label: 'TSB (Forma)', data: tsbData, backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', borderWidth: 1.5, radius: 0, fill: true }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: '#22222a' }, ticks: { color: '#9ca3af' } },
          y: { grid: { color: '#22222a' }, ticks: { color: '#9ca3af' } }
        },
        plugins: { legend: { labels: { color: '#f3f4f6' } } }
      }
    ]);
  },

  renderTrend(canvasId, labels, data, labelName, color) {
    this.destroyExisting(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{ label: labelName, data: data, borderColor: color, tension: 0.2, radius: 2 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: '#22222a' }, ticks: { color: '#9ca3af' } },
          y: { grid: { color: '#22222a' }, ticks: { color: '#9ca3af' } }
        },
        plugins: { legend: { display: false } }
      }
    ]);
  },

  renderZonesPie(canvasId, zoneTimesArray, zoneLabels) {
    this.destroyExisting(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: zoneLabels,
        datasets: [{
          data: zoneTimesArray,
          backgroundColor: ['#9ca3af', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#b91c1c'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#f3f4f6' } } }
      }
    ]);
  }
};
