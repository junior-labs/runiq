/**
 * Service isolado para chamadas de API do intervals.icu - Versão Corrigida
 */
class IntervalsService {
  constructor(athleteId, apiKey) {
    // Tratamento rigoroso: remove qualquer letra ou caractere, deixando só os números do ID
    this.athleteId = athleteId.replace(/\D/g, '');
    this.apiKey = apiKey;
    this.baseUrl = 'https://intervals.icu/api/v1';
  }

  getAuthHeader() {
    const credentials = btoa(`API_KEY:${this.apiKey}`);
    return { 'Authorization': `Basic ${credentials}` };
  }

  async fetchAthleteData() {
    try {
      const res = await fetch(`${this.baseUrl}/athlete/${this.athleteId}`, {
        headers: this.getAuthHeader()
      });
      if (!res.ok) throw new Error('Falha ao buscar dados do atleta');
      return await res.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async fetchActivities(oldestIso, newestIso) {
    try {
      const url = `${this.baseUrl}/athlete/${this.athleteId}/activities?oldest=${oldestIso}&newest=${newestIso}`;
      const res = await fetch(url, { headers: this.getAuthHeader() });
      if (!res.ok) throw new Error('Falha ao buscar atividades');
      return await res.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async fetchWellness(oldestIso, newestIso) {
    try {
      const url = `${this.baseUrl}/athlete/${this.athleteId}/wellness?oldest=${oldestIso}&newest=${newestIso}`;
      const res = await fetch(url, { headers: this.getAuthHeader() });
      if (!res.ok) throw new Error('Falha ao buscar dados de wellness');
      return await res.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
