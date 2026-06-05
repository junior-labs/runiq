/**
 * IntervalsService — RunIQ
 * 
 * Todas as chamadas passam pelo Cloudflare Worker para resolver CORS.
 * O Worker fica em: https://runiq-proxy.<seu-usuario>.workers.dev
 */
class IntervalsService {
  constructor(athleteId, apiKey) {
    // Mantém o ID exatamente como digitado (ex: i425054)
    this.athleteId = athleteId.trim();
    this.apiKey    = apiKey.trim();

    // URL do seu Cloudflare Worker — atualizar após deploy
    this.proxyBase = 'https://young-disk-1a13.junior-ins-ae.workers.dev/proxy';
  }

  getAuthHeader() {
    const credentials = btoa(`API_KEY:${this.apiKey}`);
    return { 'Authorization': `Basic ${credentials}` };
  }

  async _get(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.proxyBase}/${path}${qs ? '?' + qs : ''}`;

    const res = await fetch(url, { headers: this.getAuthHeader() });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Erro ${res.status} em /${path}: ${body}`);
    }

    return res.json();
  }

  // ── Endpoints ──────────────────────────────────────────

  /** Dados do atleta: nome, vo2max, ftp, threshold_pace, zonas */
  fetchAthleteData() {
    return this._get(`athlete/${this.athleteId}`);
  }

  /**
   * Atividades num intervalo de datas
   * @param {string} oldest  "YYYY-MM-DD"
   * @param {string} newest  "YYYY-MM-DD"
   */
  fetchActivities(oldest, newest) {
    return this._get(`athlete/${this.athleteId}/activities`, { oldest, newest });
  }

  /**
   * Wellness (CTL/ATL/TSB/HRV/FC repouso/sono) num intervalo
   * @param {string} oldest  "YYYY-MM-DD"
   * @param {string} newest  "YYYY-MM-DD"
   */
  fetchWellness(oldest, newest) {
    return this._get(`athlete/${this.athleteId}/wellness`, { oldest, newest });
  }

  /**
   * Stream detalhado de uma atividade (pace/FC/potência por segmento)
   * Usado para calcular Decoupling real
   * @param {string|number} activityId
   */
  fetchActivityStreams(activityId) {
    return this._get(`activity/${activityId}/streams`);
  }
}
