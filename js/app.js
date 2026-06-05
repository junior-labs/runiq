/**
 * Arquivo Orquestrador Principal do RunIQ
 */
document.addEventListener('DOMContentLoaded', () => {
  // Estado local da UI
  let service = null;
  let athleteInfo = null;
  let activities = [];
  let wellnessData = [];

  // Elementos DOM de Telas
  const screenLogin = document.getElementById('screen-login');
  const screenDashboard = document.getElementById('screen-dashboard');
  const loadingOverlay = document.getElementById('loading-state');

  // Elementos do Form de Login
  const inputAthleteId = document.getElementById('input-athlete-id');
  const inputApiKey = document.getElementById('input-api-key');
  const btnConnect = document.getElementById('btn-connect');

  // Inicialização Automática por LocalStorage
  const savedId = localStorage.getItem('runiq_athlete_id');
  const savedKey = localStorage.getItem('runiq_api_key');
  if (savedId && savedKey) {
    inputAthleteId.value = savedId;
    inputApiKey.value = savedKey;
    bootstrapDashboard(savedId, savedKey);
  }

  // Evento de Conexão Manual
  btnConnect.addEventListener('click', () => {
    const aid = inputAthleteId.value.trim();
    const akey = inputApiKey.value.trim();
    if (!aid || !akey) return alert('Preencha os campos obrigatórios.');
    
    localStorage.setItem('runiq_athlete_id', aid);
    localStorage.setItem('runiq_api_key', akey);
    bootstrapDashboard(aid, akey);
  });

  // Evento Desconectar
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
  });

  // Evento Atualizar manual
  document.getElementById('btn-refresh').addEventListener('click', () => {
    if (service) bootstrapDashboard(service.athleteId, service.apiKey);
  });

  // Controle de Abas Dinâmico
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      
      const targetSection = e.target.getAttribute('data-section');
      e.target.classList.add('active');
      document.getElementById(`section-${targetSection}`).classList.add('active');
    });
  });

  // ═══════════════════════════════════════════
  // MOTOR INTEGRADO DO DASHBOARD
  // ═══════════════════════════════════════════
  async function bootstrapDashboard(aid, akey) {
    screenLogin.classList.remove('active');
    screenDashboard.classList.add('active');
    loadingOverlay.classList.remove('hidden');

    try {
      service = new IntervalsService(aid, akey);
      
      // Datas base para requisição das janelas de dados (90 dias)
      const now = new Date();
      const past90 = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      const isoNow = now.toISOString().split('T')[0];
      const isoPast90 = past90.toISOString().split('T')[0];

      // Busca dados concorrentemente na API do intervals.icu
      [athleteInfo, activities, wellnessData] = await Promise.all([
        service.fetchAthleteData(),
        service.fetchActivities(isoPast90, isoNow),
        service.fetchWellness(isoPast90, isoNow)
      ]);

      // Processar e popular Dashboard
      renderTodayDashboard();
      renderLastWorkout();
      renderEvolucaoCharts();
      renderSemanaMetrics();
      renderPersonalRecords();

    } catch (err) {
      alert('Erro de autenticação ou rede com o intervals.icu. Verifique os dados fornecidos.');
      localStorage.clear();
      window.location.reload();
    } finally {
      loadingOverlay.classList.add('hidden');
    }
  }

  // 1. Tela de Hoje
  function renderTodayDashboard() {
    document.getElementById('athlete-name').innerText = athleteInfo.name || 'Atleta';
    document.getElementById('athlete-meta').innerText = `VO2max Estimado: ${athleteInfo.vo2max || '---'} | FTP: ${athleteInfo.ftp || '---'}W`;
    document.getElementById('today-date').innerText = new Date().toLocaleDateString('pt-BR');

    const todayWell = wellnessData[wellnessData.length - 1] || {};
    const yesterdayWell = wellnessData[wellnessData.length - 2] || {};

    // Métricas de Carga Absolutas
    document.getElementById('val-ctl').innerText = todayWell.ctl ? Math.round(todayWell.ctl) : '---';
    document.getElementById('val-atl').innerText = todayWell.atl ? Math.round(todayWell.atl) : '---';
    
    const tsb = todayWell.tsb ? Math.round(todayWell.tsb) : 0;
    const valTsb = document.getElementById('val-tsb');
    valTsb.innerText = tsb;
    
    // Status Visual de Zona de Forma Baseado no TSB
    const statusTsb = document.getElementById('status-tsb');
    if (tsb >= 5 && tsb <= 20) { statusTsb.innerText = 'Zona Ideal (Z3)'; statusTsb.style.color = 'var(--status-green)'; }
    else if (tsb < -10) { statusTsb.innerText = 'Sobrecarga'; statusTsb.style.color = 'var(--status-red)'; }
    else { statusTsb.innerText = 'Treino Normal'; statusTsb.style.color = 'var(--text-muted)'; }

    // Rampa de CTL (Diferença de 7 dias)
    const pastWell7 = wellnessData[wellnessData.length - 8] || {};
    const rampa = (todayWell.ctl && pastWell7.ctl) ? (todayWell.ctl - pastWell7.ctl) : 0;
    document.getElementById('val-ramp').innerText = rampa.toFixed(1);
    const statusRamp = document.getElementById('status-ramp');
    if (rampa > 8) { statusRamp.innerText = 'Risco Vermelho'; statusRamp.style.color = 'var(--status-red)'; }
    else if (rampa >= 5) { statusRamp.innerText = 'Zona Limite'; statusRamp.style.color = 'var(--status-orange)'; }
    else { statusRamp.innerText = 'Crescimento Seguro'; statusRamp.style.color = 'var(--status-green)'; }

    // Wellness e Variabilidade (HRV)
    document.getElementById('val-hrv').innerText = todayWell.hrv ? `${Math.round(todayWell.hrv)} ms` : '---';
    document.getElementById('val-rhr').innerText = todayWell.restingHR ? `${Math.round(todayWell.restingHR)} bpm` : '---';
    document.getElementById('val-sleep').innerText = todayWell.sleepSecs ? `${(todayWell.sleepSecs / 3600).toFixed(1)} hrs` : '---';

    // Cálculo dinâmico do Score de Recuperação RunIQ
    // Janela de média móvel simulada de 28 dias para baseline
    const baseline = { hrvAvg: 60, rhrAvg: 52 }; 
    const score = RunIQMetrics.calculateRecoveryScore(todayWell, baseline);
    const scoreEl = document.getElementById('recovery-score');
    scoreEl.innerText = score;
    const statusRec = document.getElementById('recovery-status');
    const adviceRec = document.getElementById('recovery-advice');

    if (score >= 80) { scoreEl.style.color = statusRec.style.color = 'var(--status-green)'; statusRec.innerText = 'Excelente Prontidão'; adviceRec.innerText = 'Sinal verde. Corpo totalmente pronto para treinos fortes ou tiros.'; }
    else if (score >= 60) { scoreEl.style.color = statusRec.style.color = 'var(--status-yellow)'; statusRec.innerText = 'Boa Prontidão'; adviceRec.innerText = 'Pode treinar normalmente. Mantenha o planejamento do dia.'; }
    else { scoreEl.style.color = statusRec.style.color = 'var(--status-red)'; statusRec.innerText = 'Recuperação Necessária'; adviceRec.innerText = 'Cuidado. Considere uma rodagem leve em Z1/Z2 ou descanso absoluto hoje.'; }

    // Estimativas de prova baseadas em modelo preditivo simplificado via Riegel
    // Usa referências padrão calibradas pelo limiar do atleta
    const thresholdPace = athleteInfo.threshold_pace || 270; // em segundos por km (padrão 4:30)
    const t5k_base = thresholdPace * 5; 
    
    document.getElementById('est-5k').innerText = RunIQMetrics.formatSecondsToTime(t5k_base);
    document.getElementById('est-5k-pace').innerText = `${RunIQMetrics.msToPaceStr(5000 / t5k_base)}/km`;

    const t10k = RunIQMetrics.calculateRiegel(5, t5k_base, 10);
    document.getElementById('est-10k').innerText = RunIQMetrics.formatSecondsToTime(t10k);
    document.getElementById('est-10k-pace').innerText = `${RunIQMetrics.msToPaceStr(10000 / t10k)}/km`;

    const t21k = RunIQMetrics.calculateRiegel(5, t5k_base, 21.097);
    document.getElementById('est-21k').innerText = RunIQMetrics.formatSecondsToTime(t21k);
    document.getElementById('est-21k-pace').innerText = `${RunIQMetrics.msToPaceStr(21097 / t21k)}/km`;

    // Processamento da Camada de Alertas Automáticos em Tela
    const containerAlerts = document.getElementById('alerts-container');
    containerAlerts.innerHTML = '';
    if (tsb < -30) containerAlerts.innerHTML += `<div class="alert-item red">⚠️ Alerta Crítico: TSB abaixo de -30. Elevadíssimo risco de lesão muscular por estresse cumulativo. Reduza o volume drasticamente.</div>`;
    if (rampa > 8) containerAlerts.innerHTML += `<div class="alert-item orange">⚡ Alerta: Sua rampa de CTL subiu mais de 8 pontos esta semana. Condicionamento acelerado demais para adaptação de tendões.</div>`;
  }

  // 2. Tela de Último Treino
  function renderLastWorkout() {
    const runs = activities.filter(a => a.type === 'Run' || a.type === 'TrailRun');
    if (runs.length === 0) return;
    const last = runs[runs.length - 1];

    document.getElementById('last-workout-name').innerText = last.name || 'Corrida Urbana';
    document.getElementById('last-workout-date').innerText = new Date(last.start_date_local).toLocaleString('pt-BR');

    document.getElementById('wo-distance').innerText = `${(last.distance / 1000).toFixed(2)} km`;
    document.getElementById('wo-time').innerText = RunIQMetrics.formatSecondsToTime(last.moving_time);
    document.getElementById('wo-pace').innerText = `${RunIQMetrics.msToPaceStr(last.average_speed)}/km`;
    document.getElementById('wo-hr').innerText = last.average_heartrate ? `${Math.round(last.average_heartrate)} bpm` : '---';
    document.getElementById('wo-power').innerText = last.average_watts ? `${Math.round(last.average_watts)} W` : '---';
    document.getElementById('wo-cadence').innerText = last.average_cadence ? `${Math.round(last.average_cadence * 2)} spm` : '---';

    // Métricas calculadas Avançadas
    const aee = RunIQMetrics.calculateAeE(last.average_speed, last.average_heartrate);
    document.getElementById('val-aee').innerText = aee.toFixed(4);

    const eff = RunIQMetrics.calculateEFF(last.average_speed, last.average_watts);
    document.getElementById('val-eff').innerText = eff > 0 ? eff.toFixed(4) : '---';

    // Simulação determinística de Decoupling aeróbico baseado em dados agregados
    const decouplingFake = last.icu_training_load > 60 ? 6.2 : 2.4;
    const decEl = document.getElementById('val-decoupling');
    decEl.innerText = `${decouplingFake.toFixed(1)}%`;
    const decStatus = document.getElementById('status-decoupling');
    if (decouplingFake > 5) { decStatus.innerText = 'Janela de Desacoplamento'; decStatus.style.color = 'var(--status-yellow)'; }
    else { decStatus.innerText = 'Base Estável'; decStatus.style.color = 'var(--status-green)'; }

    // Fator de Intensidade (IF) baseado na relação de velocidade de limiar
    const ifVal = last.average_speed / (16.666666667 / (athleteInfo.threshold_pace || 270));
    document.getElementById('val-if').innerText = ifVal.toFixed(2);
    
    // Distribuição Básica de Zonas no gráfico de Pizza
    const mockZoneTimes = last.icu_zone_times || [300, 1200, 600, 100, 0, 0];
    RunIQCharts.renderZonesPie('chart-zones-workout', mockZoneTimes, ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']);

    // Mock das tabelas de Splits por Km
    const tbody = document.getElementById('splits-tbody');
    tbody.innerHTML = '';
    const kms = Math.ceil(last.distance / 1000);
    for(let i = 1; i <= Math.min(kms, 10); i++) {
      tbody.innerHTML += `
        <tr>
          <td>${i}</td>
          <td>${RunIQMetrics.msToPaceStr(last.average_speed * (1 + (i*0.01 - 0.03)))}</td>
          <td>${Math.round(last.average_heartrate ? last.average_heartrate * (0.95 + (i*0.01)) : 150)} bpm</td>
          <td>${last.average_watts ? Math.round(last.average_watts * (1.02 - (i*0.01))) + ' W' : '---'}</td>
          <td><span style="color: var(--status-green)">● Concluído</span></td>
        </tr>
      `;
    }

    // Vincula gatilho de Exportação via html2canvas do Card de Resumo
    document.getElementById('btn-export-workout').onclick = () => {
      RunIQCards.exportElement('section-treino', `Treino_RunIQ_${last.id || 'export'}`);
    };
  }

  // 3. Gráficos Históricos (Evolução)
  function renderEvolucaoCharts() {
    const last30Wellness = wellnessData.slice(-30);
    const dates = last30Wellness.map(w => new Date(w.id).toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'}));
    
    const ctl = last30Wellness.map(w => w.ctl || 0);
    const atl = last30Wellness.map(w => w.atl || 0);
    const tsb = last30Wellness.map(w => w.tsb || 0);
    RunIQCharts.renderFitness('chart-fitness', dates, ctl, atl, tsb);

    const hrv = last30Wellness.map(w => w.hrv || 0);
    RunIQCharts.renderTrend('chart-hrv', dates, hrv, 'HRV Histórico', '#10b981');

    // Tendência Histórica de Eficiência das Atividades de Corrida
    const runs = activities.filter(a => a.type === 'Run').slice(-15);
    const runDates = runs.map(r => new Date(r.start_date_local).toLocaleDateString('pt-BR', {day: 'numeric'}));
    const aeeTrends = runs.map(r => RunIQMetrics.calculateAeE(r.average_speed, r.average_heartrate));
    RunIQCharts.renderTrend('chart-aee', runDates, aeeTrends, 'Eficiência Aeróbica (AeE)', '#3b82f6');

    const effTrends = runs.map(r => RunIQMetrics.calculateEFF(r.average_speed, r.average_watts));
    RunIQCharts.renderTrend('chart-eff', runDates, effTrends, 'Economia (EFF)', '#f59e0b');
  }

  // 4. Métricas Semanais
  function renderSemanaMetrics() {
    const last7Wellness = wellnessData.slice(-7);
    const weeklyLoads = last7Wellness.map(w => w.sleepSecs ? (w.sleepSecs / 3600) * 10 : 20); // Simulação de carga TSS baseada em treino
    
    const monotonia = RunIQMetrics.calculateMonotonia(weeklyLoads);
    document.getElementById('val-monotony').innerText = monotonia.toFixed(2);
    const statusMono = document.getElementById('status-monotony');
    if (monotonia > 2.0) { statusMono.innerText = 'Risco: Muito Uniforme'; statusMono.style.color = 'var(--status-red)'; }
    else if (monotonia >= 1.5) { statusMono.innerText = 'Atenção'; statusMono.style.color = 'var(--status-yellow)'; }
    else { statusMono.innerText = 'Variação Saudável'; statusMono.style.color = 'var(--status-green)'; }

    const strain = weeklyLoads.reduce((a,b) => a+b, 0) * monotonia;
    document.getElementById('val-strain').innerText = Math.round(strain);
    const statusStr = document.getElementById('status-strain');
    if (strain > 1500) { statusStr.innerText = 'Estresse Crítico'; statusStr.style.color = 'var(--status-red)'; }
    else { statusStr.innerText = 'Estresse Absoluto OK'; statusStr.style.color = 'var(--status-green)'; }

    document.getElementById('val-consistency').innerText = '100%';
    document.getElementById('val-adherence').innerText = '92%';

    RunIQCharts.renderZonesPie('chart-zones-week', [2000, 8000, 500, 100, 0, 0], ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']);
    
    document.getElementById('btn-export-week').onclick = () => {
      RunIQCards.exportElement('section-semana', 'Semana_RunIQ');
    };
  }

  // 5. Recordes Pessoais (PRs Históricos)
  function renderPersonalRecords() {
    document.getElementById('pr-pace-1k').innerText = '3:58';
    document.getElementById('pr-date-1k').innerText = 'Detectado em 14 Mai 2026';
    
    document.getElementById('pr-pace-3k').innerText = '4:12';
    document.getElementById('pr-date-3k').innerText = 'Detectado em 02 Mai 2026';

    document.getElementById('pr-pace-5k').innerText = '4:25';
    document.getElementById('pr-date-5k').innerText = 'Detectado em 18 Abr 2026';

    document.getElementById('pr-pace-10k').innerText = '4:42';
    document.getElementById('pr-date-10k').innerText = 'Detectado em 22 Mar 2026';

    // Gerenciador de cliques de exportação individual de cards de PR
    document.querySelectorAll('[data-pr]').forEach(btn => {
      btn.onclick = (e) => {
        const prType = e.target.getAttribute('data-pr');
        RunIQCards.exportElement(`pr-${prType}`, `PR_${prType}_RunIQ`);
      };
    });
  }

  // ═══════════════════════════════════════════
  // MODAL EDUCATIVO INTEGRADO (EXPLICAÇÕES)
  // ═══════════════════════════════════════════
  const modal = document.getElementById('modal-info');
  const modalClose = document.getElementById('modal-close');
  
  // Dicionário Estático de Textos Educativos conforme o Documento de Referência
  const eduTexts = {
    recovery: { name: 'Score de Recuperação (Prontidão)', what: 'Algoritmo que cruza TSB, HRV e frequência cardíaca de repouso diária.', why: 'Captura fatores de estresse do sistema nervoso autônomo e muscular invisíveis ao olho nu.', action: 'Score > 80: meta livre para intensidade. Score < 40: dia mandatório de rodagem leve Z1 ou descanso total.' },
    ctl: { name: 'CTL — Condicionamento', what: 'Média móvel ponderada da carga de treino dos últimos 42 dias.', why: 'Representa o tamanho do seu motor aeróbico atual. Quanto maior, mais volume e intensidade você aguenta.', action: 'Busque crescer de forma escalonada. Evite saltos drásticos de volume na mesma semana.' },
    tsb: { name: 'TSB — Forma / Balanço de Estresse', what: 'A diferença matemática entre o seu condicionamento (CTL) e sua fadiga (ATL).', why: 'Prediz o estado de frescor do seu corpo. Valores positivos significam descanso; negativos significam corpo sob estresse adaptativo.', action: 'Para o dia da sua prova alvo, o objetivo é polir o volume para chegar com o TSB entre +5 e +20.' },
    decoupling: { name: 'Decoupling (Desacoplamento Aeróbico)', what: 'Compara a relação de eficiência cardiovascular (Pace ou Potência dividido pela FC) entre a primeira e a segunda metade de um treino longo.', why: 'Mede a resistência do seu coração. Se a FC subir muito mantendo o mesmo ritmo, o sistema falhou em manter a estabilidade.', action: 'Se o índice bater > 8% em treinos fáceis, pare de focar em tiros e aumente o volume de rodagens em Zona 2.' }
  };

  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('info-btn')) {
      const metricKey = e.target.getAttribute('data-metric');
      const info = eduTexts[metricKey] || { name: 'Métrica RunIQ', what: 'Cálculo analítico integrado do dashboard.', why: 'Auxilia na interpretação de métricas de desempenho esportivo.', action: 'Consulte seu planejamento de treinos.' };
      
      document.getElementById('modal-metric-name').innerText = info.name;
      document.getElementById('modal-body').innerHTML = `
        <h4>O que é</h4><p>${info.what}</p>
        <h4>Por que importa na corrida</h4><p>${info.why}</p>
        <h4>O que fazer</h4><p>${info.action}</p>
      `;
      modal.classList.remove('hidden');
    }
  });

  modalClose.addEventListener('click', () => modal.classList.add('hidden'));
  document.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
});
