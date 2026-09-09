const form = document.getElementById('distance-form');
const resultEl = document.getElementById('result');
const errorEl = document.getElementById('error');
const submitBtn = form.querySelector('button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const origin = document.getElementById('origin').value.trim();
  const destination = document.getElementById('destination').value.trim();
  const claimedMiles = document.getElementById('claimedMiles').value.trim();

  resultEl.hidden = true;
  errorEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking...';

  try {
    const params = new URLSearchParams({ origin, destination });
    if (claimedMiles) params.set('claimedMiles', claimedMiles);

    const response = await fetch(`/api/distance?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    renderResult(data);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Check distance';
  }
});

function renderResult(data) {
  let html = `
    <div>${data.origin} &rarr; ${data.destination}</div>
    <div><strong>${data.distanceMiles} miles</strong> (${data.durationText} driving)</div>
  `;

  resultEl.className = 'result';

  if (data.claimedMiles !== undefined) {
    const sign = data.differenceMiles > 0 ? '+' : '';
    html += `
      <div>Driver claimed: ${data.claimedMiles} miles</div>
      <div>Difference: ${sign}${data.differenceMiles} miles (${data.discrepancyPercent}%)</div>
    `;
    if (data.flagged) {
      html += `<div><strong>⚠ Flagged:</strong> discrepancy exceeds ${data.discrepancyThresholdPercent}% threshold.</div>`;
      resultEl.classList.add('flagged');
    } else {
      html += `<div>Within acceptable range (≤ ${data.discrepancyThresholdPercent}%).</div>`;
      resultEl.classList.add('ok');
    }
  }

  resultEl.innerHTML = html;
  resultEl.hidden = false;
}
