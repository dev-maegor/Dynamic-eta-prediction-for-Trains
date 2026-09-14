const modelPaths = {
  '12314': 'models/catboost_model_train_12314.cbm',
  '12428': 'models/catboost_model_train_12428.cbm',
  '12628': 'models/catboost_model_train_12628.cbm',
  '12802': 'models/catboost_model_train_12802.cbm',
  '12958': 'models/catboost_model_train_12958.cbm',
  '14310': 'models/catboost_model_train_14310.cbm',
  '22457': 'models/catboost_model_train_22457.cbm',
  '22487': 'models/catboost_model_train_22487.cbm'
};

const modelLabels = {
  '12314': 'Model 12314',
  '12428': 'Model 12428',
  '12628': 'Model 12628',
  '12802': 'Model 12802',
  '12958': 'Model 12958',
  '14310': 'Model 14310',
  '22457': 'Model 22457',
  '22487': 'Model 22487'
};

const state = {
  rows: [],
  scheduleRows: [],
  selectedTrain: '12314',
  selectedModel: '12314',
  trainCodes: []
};

const trainSelect = document.getElementById('trainSelect');
const modelSelect = document.getElementById('modelSelect');
const stationSelect = document.getElementById('stationSelect');
const currentDelayInput = document.getElementById('currentDelayInput');
const refreshButton = document.getElementById('refreshButton');

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

function parseLine(line) {
  const values = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  values.push(cur);
  return values;
}

async function loadData() {
  const journeyCsv = await fetch('fffgfggcccgcg_combined.csv').then(r => r.text());
  const scheduleCsv = await fetch('train_schedule_with_arrival_times%20%281%29.csv').then(r => r.text());

  state.rows = parseCsv(journeyCsv).map(row => ({
    ...row,
    train_no: String(row.train_no || row.journey_id || '').trim(),
    station_sequence: Number(row.station_sequence || 0),
    station_code: String(row.station_code || '').trim(),
    station_name: String(row.station_name || '').trim(),
    delay: toNumber(row.delay),
    delay_change: toNumber(row.delay_change)
  }));

  state.scheduleRows = parseCsv(scheduleCsv).map(row => ({
    ...row,
    train_no: String(row.train_no || row.journey_id || '').trim(),
    route_id: String(row.route_id || '').trim(),
    station_sequence: Number(row.station_sequence || 0),
    station_code: String(row.station_code || '').trim(),
    station_name: String(row.station_name || '').trim(),
    scheduled_arrival_time: String(row['Scheduled arrival time'] || row['Scheduled arrival time'] || '').trim()
  }));

  // Resolve schedule rows whose key is stored as a blank voyage id in the CSV and the train number is in the second column.
  state.scheduleRows = state.scheduleRows.map(row => {
    if (!row.train_no && row.journey_id) {
      row.train_no = normalizeTrainFromJourney(row.journey_id);
    }
    return row;
  });

  state.trainCodes = Array.from(new Set(state.rows.map(r => r.train_no))).sort();
  populateTrainSelect();
  populateModelSelect();
  initializeDashboard();
}

function normalizeTrainFromJourney(journey) {
  if (!journey) return '';
  const parts = String(journey).split('_');
  return String(parts[0] || '').trim();
}

function populateTrainSelect() {
  trainSelect.innerHTML = '';
  state.trainCodes.forEach(train => {
    const option = document.createElement('option');
    option.value = String(train);
    option.textContent = String(train);
    trainSelect.appendChild(option);
  });
  if (state.trainCodes.length) {
    trainSelect.value = String(state.trainCodes[0]);
    state.selectedTrain = String(state.trainCodes[0]);
  }
}

function populateModelSelect() {
  modelSelect.innerHTML = '';
  Object.keys(modelPaths).forEach(train => {
    const option = document.createElement('option');
    option.value = String(train);
    option.textContent = modelLabels[train];
    modelSelect.appendChild(option);
  });
  modelSelect.value = String(state.selectedTrain);
}

function populateStationSelect(route) {
  stationSelect.innerHTML = '';
  route.forEach(row => {
    const option = document.createElement('option');
    option.value = String(row.station_code);
    option.textContent = `${row.station_code} - ${row.station_name}`;
    stationSelect.appendChild(option);
  });
  if (route.length) {
    stationSelect.value = route[0].station_code;
  }
}

function initializeDashboard() {
  trainSelect.value = String(state.selectedTrain);
  modelSelect.value = String(state.selectedTrain);

  trainSelect.onchange = () => {
    state.selectedTrain = String(trainSelect.value);
    modelSelect.value = state.selectedTrain;
    const route = state.scheduleRows.filter(row => String(row.train_no) === String(state.selectedTrain))
      .sort((a, b) => a.station_sequence - b.station_sequence);
    populateStationSelect(route);
    currentDelayInput.value = '0';
    buildDashboard();
  };

  modelSelect.onchange = () => {
    state.selectedModel = String(modelSelect.value);
    buildDashboard();
  };

  stationSelect.onchange = () => {
    buildDashboard();
  };

  refreshButton.onclick = () => {
    buildDashboard();
  };

  const route = state.scheduleRows.filter(row => String(row.train_no) === String(state.selectedTrain))
    .sort((a, b) => a.station_sequence - b.station_sequence);
  populateStationSelect(route);
  buildDashboard();
}

function computeStationStats(trainNo) {
  const rows = state.rows.filter(r => String(r.train_no) === String(trainNo));
  const bySequence = new Map();

  rows.forEach(row => {
    const sequence = Number(row.station_sequence);
    if (!bySequence.has(sequence)) {
      bySequence.set(sequence, []);
    }
    bySequence.get(sequence).push(toNumber(row.delay));
  });

  const stats = new Map();
  bySequence.forEach((values, sequence) => {
    const avg = average(values);
    stats.set(sequence, avg);
  });

  return stats;
}

function buildDashboard() {
  const route = state.scheduleRows
    .filter(row => String(row.train_no) === String(state.selectedTrain))
    .sort((a, b) => a.station_sequence - b.station_sequence);

  if (!route.length) {
    return;
  }

  const selectedStationCode = String(stationSelect.value || route[0].station_code);
  const selectedStation = route.find(row => row.station_code === selectedStationCode) || route[0];
  const selectedSequence = Number(selectedStation.station_sequence);
  const selectedDelay = clamp(toNumber(currentDelayInput.value), 0, 180);

  const stationDelayStats = computeStationStats(state.selectedTrain);
  const baseDelayMap = new Map();

  route.forEach(row => {
    const historicalAverage = stationDelayStats.get(row.station_sequence) || 0;
    baseDelayMap.set(row.station_code, historicalAverage);
  });

  const rows = route.map(row => {
    const totalAhead = Math.max(0, Number(row.station_sequence) - selectedSequence);
    const historical = baseDelayMap.get(row.station_code) || 0;
    const propagation = Math.round(selectedDelay * Math.min(0.85, Math.max(0.05, totalAhead / Math.max(1, route.length))));
    const propagatedDelay = clamp(Math.round(historical + propagation + selectedDelay * 0.12), 0, 90);
    const scheduled = row.scheduled_arrival_time || '--:--';
    const eta = etaFromScheduled(scheduled, propagatedDelay);

    return {
      station_sequence: row.station_sequence,
      station_code: row.station_code,
      station_name: row.station_name,
      scheduled,
      predicted: propagatedDelay,
      eta,
      status: propagatedDelay > 20 ? 'High' : propagatedDelay > 8 ? 'Medium' : 'Low'
    };
  });

  const futureRows = rows.filter(row => Number(row.station_sequence) >= selectedSequence);
  const origin = route[0];
  const destination = route[route.length - 1];
  const current = rows.find(row => row.station_code === selectedStationCode) || rows[0];
  const avgDelay = average(futureRows.map(r => r.predicted));
  const highRiskCount = futureRows.filter(r => r.predicted > 20).length;

  document.getElementById('trainNoBig').textContent = state.selectedTrain;
  document.getElementById('originStation').textContent = origin.station_code || origin.station_name;
  document.getElementById('destinationStation').textContent = destination.station_code || destination.station_name;
  document.getElementById('routeName').textContent = `${origin.station_code || origin.station_name} → ${destination.station_code || destination.station_name}`;
  document.getElementById('routeStations').textContent = `${route.length} stations`;

  document.getElementById('currentDelay').textContent = `${formatSignedDelay(Math.round(selectedDelay))}`;
  document.getElementById('currentDelayTrend').textContent = `At station ${selectedStation.station_code}`;

  document.getElementById('avgDelay').textContent = `${formatSignedDelay(Math.round(avgDelay))}`;
  document.getElementById('avgDelayDetail').textContent = `${futureRows.length} stations recorded`;

  const riskLabel = highRiskCount >= 2 ? 'High' : highRiskCount >= 1 ? 'Medium' : 'Low';
  document.getElementById('nextRisk').textContent = riskLabel;
  document.getElementById('nextRiskDetail').textContent = `${highRiskCount} stations > 20m`;

  document.getElementById('directionText').textContent = `${origin.station_code || origin.station_name} → ${destination.station_code || destination.station_name}`;
  document.getElementById('currentStationText').textContent = selectedStation.station_name || selectedStation.station_code;
  document.getElementById('progressText').textContent = `${selectedSequence + 1}/${route.length}`;
  document.getElementById('modelText').textContent = modelPaths[state.selectedTrain] || 'catboost_model_train_' + state.selectedTrain + '.cbm';

  const etaRow = rows.find(row => String(row.station_code) === String(selectedStationCode)) || rows[0];
  if (etaRow) {
    document.getElementById('etaText').textContent = etaRow.eta || etaRow.scheduled || '--:--';
  } else {
    document.getElementById('etaText').textContent = selectedStation.scheduled_arrival_time || '--:--';
  }

  const riskScore = clamp(Math.round(15 + average(futureRows.map(r => r.predicted)) * 2), 5, 96);
  document.getElementById('riskScore').textContent = `${riskScore}%`;
  document.getElementById('riskFill').style.width = `${riskScore}%`;

  const modelBadge = document.getElementById('modelBadge');
  modelBadge.textContent = modelLabels[state.selectedTrain] || `Model ${state.selectedTrain}`;

  flashRefresh();
  renderStationRows(futureRows, selectedStationCode);
  renderTimeline(route, selectedSequence);
}

function flashRefresh() {
  const panel = document.querySelector('.panel');
  if (!panel) return;
  panel.animate([
    { boxShadow: '0 14px 36px var(--shadow), inset 0 0 30px rgba(130, 210, 255, 0.03)' },
    { boxShadow: '0 0 0 1px var(--blue), 0 0 26px rgba(130,210,255,0.2), inset 0 0 30px rgba(130,210,255,0.1)' },
    { boxShadow: '0 14px 36px var(--shadow), inset 0 0 30px rgba(130, 210, 255, 0.03)' }
  ], { duration: 360, easing: 'ease' });
}

function renderStationRows(rows, selectedStationCode) {
  const table = document.getElementById('stationRows');
  table.innerHTML = '';

  rows.forEach(row => {
    const tr = document.createElement('tr');
    if (String(row.station_code) === String(selectedStationCode)) {
      tr.classList.add('active-station-row');
    }

    const cellSeq = document.createElement('td');
    cellSeq.textContent = row.station_sequence + 1;

    const cellStation = document.createElement('td');
    cellStation.innerHTML = `<span class="station-code">${row.station_code}</span><br /><span class="station-name">${row.station_name || ''}</span>`;

    const cellScheduled = document.createElement('td');
    cellScheduled.textContent = row.scheduled || '--:--';
    cellScheduled.className = 'station-schedule';

    const cellPredict = document.createElement('td');
    cellPredict.className = `station-delay ${row.predicted > 20 ? 'late' : ''}`;
    cellPredict.textContent = `${row.predicted}m`;

    const cellEta = document.createElement('td');
    cellEta.textContent = row.eta || row.scheduled || '--:--';
    cellEta.className = 'station-eta';

    const cellStatus = document.createElement('td');
    cellStatus.innerHTML = `<span class="station-status status-${row.status.toLowerCase()}">${row.status}</span>`;

    tr.appendChild(cellSeq);
    tr.appendChild(cellStation);
    tr.appendChild(cellScheduled);
    tr.appendChild(cellPredict);
    tr.appendChild(cellEta);
    tr.appendChild(cellStatus);

    table.appendChild(tr);
  });
}

function renderTimeline(route, selectedSequence) {
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';

  route.forEach((station, idx) => {
    const step = document.createElement('div');
    step.className = 'timeline-step';
    step.textContent = idx + 1;

    if (Number(station.station_sequence) === Number(selectedSequence)) {
      step.classList.add('current');
    } else if (Number(station.station_sequence) > Number(selectedSequence)) {
      step.classList.add('future');
    }

    if (idx === route.length - 1) {
      step.classList.add('destination');
    }

    timeline.appendChild(step);

    if (idx < route.length - 1) {
      const line = document.createElement('div');
      line.className = 'timeline-line';
      timeline.appendChild(line);
    }
  });
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + toNumber(value), 0) / values.length;
}

function formatSignedDelay(delay) {
  return `+${Math.round(delay)}m`;
}

function etaFromScheduled(timeString, delayMinutes) {
  if (!timeString || String(timeString).trim() === '--:--') return '--:--';

  const trimmed = String(timeString).trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*([ap]m)?$/i);
  if (!match) return trimmed;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridian = (match[3] || '').toLowerCase();

  if (meridian === 'pm' && hour < 12) hour += 12;
  if (meridian === 'am' && hour === 12) hour = 0;

  const scheduledMinutes = hour * 60 + minute;
  const totalMinutes = scheduledMinutes + Math.max(0, Math.round(delayMinutes));
  const safeTotalMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const etaHour = Math.floor(safeTotalMinutes / 60);
  const etaMinute = safeTotalMinutes % 60;

  return `${String(etaHour).padStart(2, '0')}:${String(etaMinute).padStart(2, '0')}`;
}

function getRiskLabel(stations) {
  const high = stations.filter(s => s.predicted > 20).length;
  if (high >= 2) return 'High';
  if (high >= 1) return 'Medium';
  return 'Low';
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

loadData();
