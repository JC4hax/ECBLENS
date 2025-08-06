// --------- ecbData should be loaded first (from your ecb-data.js or at top of this file) ----------

// Chart.js color styles
const chartColors = {
  refi: { border: '#002147', background: 'rgba(0,33,71,0.12)' },
  deposit: { border: '#28a745', background: 'rgba(40,167,69,0.12)' },
  lending: { border: '#dc3545', background: 'rgba(220,53,69,0.12)' }
};
let charts = {};

// Get latest rate value and trend for a rate type
function getLatestRateAndTrend(type) {
  const data = ecbData[type];
  // Find latest year with a value
  const years = Object.keys(data).sort((a, b) => b - a);
  let latest = null, previous = null;
  for (let y of years) {
    for (let i = data[y].length - 1; i >= 0; i--) {
      if (data[y][i].value !== null && data[y][i].value !== undefined) {
        if (!latest) latest = data[y][i].value;
        else if (!previous) previous = data[y][i].value;
        if (latest && previous) break;
      }
    }
    if (latest && previous) break;
  }
  let trend = "↔ No change";
  if (latest && previous) {
    if (latest > previous) trend = "↗ Increasing";
    else if (latest < previous) trend = "↘ Decreasing";
  }
  return { value: latest ?? '?', trend };
}

// Fill rate boxes on index.html
function fillBoxes() {
  const types = [
    { type: 'refi', name: 'Main Refinancing Rate' },
    { type: 'deposit', name: 'Deposit Facility Rate' },
    { type: 'lending', name: 'Marginal Lending Rate' }
  ];
  types.forEach(({ type, name }) => {
    // For index.html
    document.querySelectorAll('.rate-box').forEach(box => {
      const title = box.querySelector('h3');
      if (title && title.textContent.includes(name)) {
        const { value, trend } = getLatestRateAndTrend(type);
        const rateVal = box.querySelector('.rate-value');
        if (rateVal) rateVal.textContent = value + "%";
        const rateTrend = box.querySelector('.rate-trend');
        if (rateTrend) {
          rateTrend.textContent = trend;
          rateTrend.classList.remove('up', 'down', 'neutral');
          if (trend.includes('Increasing')) rateTrend.classList.add('up');
          else if (trend.includes('Decreasing')) rateTrend.classList.add('down');
          else rateTrend.classList.add('neutral');
        }
      }
    });
    // For rates.html
    document.querySelectorAll('.rate-card').forEach(card => {
      const title = card.querySelector('h3');
      if (title && title.textContent.includes(name)) {
        const { value, trend } = getLatestRateAndTrend(type);
        const rateVal = card.querySelector('.rate-value-large');
        if (rateVal) rateVal.textContent = value + "%";
        const rateTrend = card.querySelector('.rate-trend-large');
        if (rateTrend) {
          rateTrend.textContent = trend;
          rateTrend.classList.remove('up', 'down', 'neutral');
          if (trend.includes('Increasing')) rateTrend.classList.add('up');
          else if (trend.includes('Decreasing')) rateTrend.classList.add('down');
          else rateTrend.classList.add('neutral');
        }
      }
    });
  });
}

// Chart display for modals, by year (for rates.html and index.html)
function filterToJune2025(labels, values) {
  // Only keep data up to and including 2025-06
  let cutoffIndex = labels.findIndex(lab => lab.startsWith('2025-07'));
  if (cutoffIndex === -1) return { labels, values };
  return { labels: labels.slice(0, cutoffIndex), values: values.slice(0, cutoffIndex) };
}

function updateHistoricalChart(chartId, type, year = null) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  if (charts[type]) charts[type].destroy();

  const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';
  let labels = [], values = [];
  if (isIndex) {
    const years = Object.keys(ecbData[type]).sort((a, b) => a - b);
    years.forEach(year => {
      ecbData[type][year].forEach(entry => {
        labels.push(year + '-' + entry.date.split('-')[1]);
        values.push(entry.value);
      });
    });
    // Filter to June 2025
    ({ labels, values } = filterToJune2025(labels, values));
  } else {
    const years = Object.keys(ecbData[type]).sort((a, b) => b - a);
    if (!year) year = years[0];
    const yearData = ecbData[type][year];
    labels = yearData.map(entry => entry.date);
    values = yearData.map(entry => entry.value);
    // If year is 2025, filter to June
    if (year === '2025') {
      const cutoffIdx = labels.findIndex(lab => lab.startsWith('2025-07'));
      if (cutoffIdx !== -1) {
        labels = labels.slice(0, cutoffIdx);
        values = values.slice(0, cutoffIdx);
      }
    }
  }

  charts[type] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: type.charAt(0).toUpperCase() + type.slice(1) + (isIndex ? ' Rate (1999-2025)' : ' Rate - ' + (year || '')),
        data: values,
        borderColor: chartColors[type].border,
        backgroundColor: chartColors[type].background,
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { font: { size: 15 } } },
        tooltip: { enabled: true, mode: 'index', intersect: false }
      },
      hover: { mode: 'nearest', intersect: false },
      scales: {
        x: {
          title: { display: true, text: isIndex ? 'Year-Month' : 'Month', font: { size: 14 } },
          grid: { color: '#e9ecef' },
          ticks: { maxTicksLimit: isIndex ? 30 : undefined }
        },
        y: {
          beginAtZero: false,
          title: { display: true, text: 'Rate (%)', font: { size: 14 } },
          grid: { color: '#e9ecef' },
          ticks: { callback: v => v.toFixed(1) + '%' }
        }
      }
    }
  });
  if (!isIndex) {
    if (document.getElementById(`year-${type}`)) document.getElementById(`year-${type}`).textContent = year;
    if (document.getElementById(`${type}-chart-title`)) document.getElementById(`${type}-chart-title`).textContent =
      (type.charAt(0).toUpperCase() + type.slice(1)) + ' Rate - ' + year;
  }
}

// Modal logic
function openModal(type) {
  const modal = document.getElementById(`modal-${type}`);
  if (modal) {
    modal.style.display = 'block';
    updateHistoricalChart(`chart${type.charAt(0).toUpperCase() + type.slice(1)}`, type);
  }
}
function closeModal(type) {
  const modal = document.getElementById(`modal-${type}`);
  if (modal) modal.style.display = 'none';
}

// Year navigation for modal charts (rates.html)
function changeYear(type, direction) {
  const years = Object.keys(ecbData[type]).sort((a, b) => b - a);
  let currentYear = document.getElementById(`year-${type}`).textContent;
  let idx = years.indexOf(currentYear);
  if (direction === 'prev' && idx < years.length - 1) idx++;
  if (direction === 'next' && idx > 0) idx--;
  updateHistoricalChart(`chart${type.charAt(0).toUpperCase() + type.slice(1)}`, type, years[idx]);
}

// Clicking outside modal closes it
window.onclick = function(event) {
  document.querySelectorAll('.modal').forEach(modal => {
    if (event.target === modal) modal.style.display = 'none';
  });
};

// --- Detailed Charts for rates.html ---
function renderCombinedRatesChart() {
  const canvas = document.getElementById('combinedRatesChart');
  if (!canvas) return;
  if (charts['combined']) charts['combined'].destroy();

  const years = Object.keys(ecbData.refi).sort((a, b) => a - b);
  const months = [
    '01', '02', '03', '04', '05', '06',
    '07', '08', '09', '10', '11', '12'
  ];
  let labels = [];
  years.forEach(year => {
    months.forEach(month => {
      labels.push(`${year}-${month}`);
    });
  });
  // Filter to June 2025
  let cutoffIndex = labels.findIndex(lab => lab === '2025-07');
  if (cutoffIndex !== -1) labels = labels.slice(0, cutoffIndex);

  function flattenValues(type) {
    let arr = [];
    years.forEach(year => {
      months.forEach(month => {
        if (ecbData[type][year]) {
          const entry = ecbData[type][year].find(e => e.date.endsWith('-' + month));
          if (entry) arr.push(entry.value);
        }
      });
    });
    if (cutoffIndex !== -1) arr = arr.slice(0, cutoffIndex);
    return arr;
  }

  charts['combined'] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Main Refinancing Rate',
          data: flattenValues('refi'),
          borderColor: chartColors.refi.border,
          backgroundColor: 'rgba(0,33,71,0.08)',
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 6,
        },
        {
          label: 'Deposit Facility Rate',
          data: flattenValues('deposit'),
          borderColor: chartColors.deposit.border,
          backgroundColor: 'rgba(40,167,69,0.08)',
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 6,
        },
        {
          label: 'Marginal Lending Rate',
          data: flattenValues('lending'),
          borderColor: chartColors.lending.border,
          backgroundColor: 'rgba(220,53,69,0.08)',
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { font: { size: 16 } } },
        tooltip: { enabled: true, mode: 'index', intersect: false }
      },
      hover: { mode: 'nearest', intersect: false },
      scales: {
        x: {
          title: { display: true, text: 'Year-Month', font: { size: 15 } },
          grid: { color: '#e9ecef' },
          ticks: { maxTicksLimit: 30 }
        },
        y: {
          beginAtZero: false,
          title: { display: true, text: 'Rate (%)', font: { size: 15 } },
          grid: { color: '#e9ecef' },
          ticks: { callback: v => v.toFixed(1) + '%' }
        }
      }
    }
  });
}

function renderDetailedYearlyChart(type, year) {
  const canvasId = {
    refi: 'detailedRefiChart',
    deposit: 'detailedDepositChart',
    lending: 'detailedLendingChart'
  }[type];
  if (!canvasId) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) charts[canvasId].destroy();

  const yearData = ecbData[type][year];
  if (!yearData) return;
  let labels = yearData.map(entry => entry.date.split('-')[1]);
  let values = yearData.map(entry => entry.value);
  if (year === '2025') {
    const cutoffIdx = labels.findIndex(m => m === '07');
    if (cutoffIdx !== -1) {
      labels = labels.slice(0, cutoffIdx);
      values = values.slice(0, cutoffIdx);
    }
  }

  charts[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: type.charAt(0).toUpperCase() + type.slice(1) + ' Rate - ' + year,
        data: values,
        borderColor: chartColors[type].border,
        backgroundColor: chartColors[type].background,
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { font: { size: 15 } } },
        tooltip: { enabled: true, mode: 'index', intersect: false }
      },
      hover: { mode: 'nearest', intersect: false },
      scales: {
        x: {
          title: { display: true, text: 'Month', font: { size: 14 } },
          grid: { color: '#e9ecef' }
        },
        y: {
          beginAtZero: false,
          title: { display: true, text: 'Rate (%)', font: { size: 14 } },
          grid: { color: '#e9ecef' },
          ticks: { callback: v => v.toFixed(1) + '%' }
        }
      }
    }
  });
  document.getElementById('detailed-year-' + type).textContent = year;
}

// Year navigation for detailed charts
function changeDetailedYear(type, direction) {
  const years = Object.keys(ecbData[type]).sort((a, b) => b - a);
  let currentYear = document.getElementById('detailed-year-' + type).textContent;
  let idx = years.indexOf(currentYear);
  if (direction === 'prev' && idx < years.length - 1) idx++;
  if (direction === 'next' && idx > 0) idx--;
  renderDetailedYearlyChart(type, years[idx]);
}

// Initialize detailed charts on rates.html
function initDetailedCharts() {
  if (document.getElementById('combinedRatesChart')) {
    renderCombinedRatesChart();
  }
  ['refi', 'deposit', 'lending'].forEach(type => {
    const years = Object.keys(ecbData[type]).sort((a, b) => b - a);
    if (years.length > 0) {
      renderDetailedYearlyChart(type, years[0]);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fillBoxes();
  // If on index.html, open modal uses openModal(type)
  // If on rates.html, open modal uses openModal(type) & year navigation
  if (window.location.pathname.includes('rates.html')) {
    initDetailedCharts();
  }
});


