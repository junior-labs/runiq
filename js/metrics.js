/**
 * Biblioteca matemática e lógica das 14 métricas do RunIQ
 */
const RunIQMetrics = {
  
  // Converte velocidade m/s para string de pace padrão de corrida (MM:SS)
  msToPaceStr(ms) {
    if (!ms || ms <= 0) return '--:--';
    const paceMinDecimal = 16.666666667 / ms;
    const mins = Math.floor(paceMinDecimal);
    const secs = Math.round((paceMinDecimal - mins) * 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs == 60 ? '00' : secs}`;
  },

  // Calcula Eficiência Aeróbica (AeE)[cite: 1]
  calculateAeE(avgSpeedMs, avgHeartRate) {
    if (!avgSpeedMs || !avgHeartRate) return 0;
    return avgSpeedMs / avgHeartRate;
  },

  // Calcula Economia de Corrida (EFF)[cite: 1]
  calculateEFF(avgSpeedMs, avgWatts) {
    if (!avgSpeedMs || !avgWatts) return 0;
    return avgSpeedMs / avgWatts;
  },

  // Calcula Decoupling (Pw:Hr ou Pace:Hr) baseado nos splits[cite: 1]
  calculateDecoupling(splits) {
    if (!splits || splits.length < 2) return 0;
    
    const half = Math.ceil(splits.length / 2);
    const firstHalf = splits.slice(0, half);
    const secondHalf = splits.slice(half);

    const getRatio = (segment) => {
      let sumHr = 0, sumEffort = 0, count = 0;
      segment.forEach(s => {
        if (s.average_heartrate && (s.average_watts || s.average_speed)) {
          sumHr += s.average_heartrate;
          sumEffort += s.average_watts ? s.average_watts : s.average_speed;
          count++;
        }
      });
      return count > 0 ? (sumEffort / count) / (sumHr / count) : 0;
    };

    const ratio1 = getRatio(firstHalf);
    const ratio2 = getRatio(secondHalf);

    if (ratio1 === 0 || ratio2 === 0) return 0;
    return ((ratio2 - ratio1) / ratio1) * 100;
  },

  // Score de Prontidão (0-100) baseado no TSB, HRV e RHR[cite: 1]
  calculateRecoveryScore(todayWellness, baselineWellness) {
    if (!todayWellness || !baselineWellness) return 75;

    const tsb = todayWellness.tsb || 0;
    const hrvToday = todayWellness.hrv || 0;
    const hrvAvg = baselineWellness.hrvAvg || hrvToday;
    const rhrToday = todayWellness.restingHR || 0;
    const rhrAvg = baselineWellness.rhrAvg || rhrToday;

    // 1. Componente TSB (Forma) - Peso 40%[cite: 1]
    let scoreTSB = 50;
    if (tsb >= 5 && tsb <= 20) scoreTSB = 100;
    else if (tsb > 20) scoreTSB = 85;
    else if (tsb < 0 && tsb >= -10) scoreTSB = 75;
    else if (tsb < -10 && tsb >= -30) scoreTSB = 50;
    else scoreTSB = 20;

    // 2. Componente HRV - Peso 35%[cite: 1]
    let scoreHRV = 100;
    if (hrvAvg > 0 && hrvToday > 0) {
      const pct = (hrvToday / hrvAvg) * 100;
      if (pct < 90) scoreHRV = 40;
    }

    // 3. Componente RHR (Frequência Cardíaca de Repouso) - Peso 25%[cite: 1]
    let scoreRHR = 100;
    if (rhrAvg > 0 && rhrToday > 0) {
      const diff = rhrToday - rhrAvg;
      if (diff > 4) scoreRHR = 30;
    }

    return Math.round((scoreTSB * 0.40) + (scoreHRV * 0.35) + (scoreRHR * 0.25));
  },

  // Fórmula de Riegel para estimativa de tempos de prova[cite: 1]
  calculateRiegel(d1, t1, d2) {
    return t1 * Math.pow((d2 / d1), 1.06);
  },

  formatSecondsToTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);

    const pad = (num) => String(num).padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${minutes}:${pad(seconds)}`;
  },

  // Monotonia da Carga[cite: 1]
  calculateMonotonia(weeklyLoads) {
    if (!weeklyLoads || weeklyLoads.length === 0) return 1.0;
    const avg = weeklyLoads.reduce((a,b) => a+b, 0) / 7;
    const sqDiff = weeklyLoads.map(v => Math.pow(v - avg, 2));
    const stdDev = Math.sqrt(sqDiff.reduce((a,b) => a+b, 0) / 7);
    if (stdDev === 0) return 2.5;
    return avg / stdDev;
  }
};
