javascript
/* === MY SWEEPSTAKES HUB - DATA LOADER === */
// Loads sweepstakes from sites_db.json and user submissions

const CACHE_KEY = 'sweepstakes_rss_cache';
const CACHE_TIME = 60 * 60 * 1000;

const FALLBACK_SWEEPS = [
    { title: 'Win a $1,000 Amazon Gift Card', link: '#', category: 'Gift Cards', endDate: '06/30/26', frequency: 'Daily', addedDate: '05/02/26' },
    { title: '$5,000 Home Depot Shopping Spree', link: '#', category: 'Home & Garden', endDate: '07/15/26', frequency: 'Single', addedDate: '05/02/26' },
    { title: 'Trip for 2 to Las Vegas', link: '#', category: 'Travel', endDate: '06/15/26', frequency: 'Daily', addedDate: '05/01/26' },
    { title: 'Win the New iPhone 17 Pro', link: '#', category: 'Electronics', endDate: '08/01/26', frequency: 'Single', addedDate: '05/02/26' },
    { title: '$500 Target Gift Card Giveaway', link: '#', category: 'Gift Cards', endDate: '05/31/26', frequency: 'Daily', addedDate: '04/30/26' },
    { title: 'Year Supply of Starbucks Coffee', link: '#', category: 'Food & Drink', endDate: '07/01/26', frequency: 'Monthly', addedDate: '05/01/26' },
    { title: 'Disney World Family Vacation Package', link: '#', category: 'Travel', endDate: '09/30/26', frequency: 'Single', addedDate: '04/29/26' },
    { title: 'MacBook Pro + AirPods Bundle', link: '#', category: 'Electronics', endDate: '06/30/26', frequency: 'Daily', addedDate: '05/02/26' },
    { title: '$2,500 Fashion Shopping Spree', link: '#', category: 'Fashion', endDate: '06/22/26', frequency: 'Single', addedDate: '04/28/26' },
    { title: 'Ultimate Gaming Setup Giveaway', link: '#', category: 'Electronics', endDate: '07/15/26', frequency: 'Weekly', addedDate: '05/01/26' }
];

function getToday() {
    const d = new Date();
    return (d.getMonth()+1).toString().padStart(2,'0')+'/'+d.getDate().toString().padStart(2,'0')+'/'+d.getFullYear().toString().slice(2);
}

function renderSweepstakes(sweeps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const tbody = container.querySelector('tbody');
    if (!tbody) return;
    if (!sweeps || sweeps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No sweepstakes yet. <a href="submit.html">Submit the first one!</a></td></tr>';
        return;
    }
    const today = getToday();
    let html = '';
    sweeps.forEach((s, i) => {
        const rowClass = i % 2 === 0 ? '' : 'row-alt';
        const isNew = s.addedDate === today;
        html += `<tr class="${rowClass}">
            <td><a href="${s.link || '#'}" target="_blank" rel="noopener">${s.title}</a>${isNew?' <span class="new-badge">NEW</span>':''}</td>
            <td><a href="category.html">${s.category || 'Various'}</a></td>
            <td>${s.endDate || 'Unknown'}</td>
            <td>${s.frequency || 'Single'}</td>
            <td>${s.addedDate || today}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
    updateCounts(sweeps);
}

function updateCounts(sweeps) {
    const countEl = document.getElementById('sweeps-count');
    if (countEl) countEl.textContent = sweeps.length;
    const totalEl = document.getElementById('total-sweeps');
    if (totalEl) totalEl.textContent = sweeps.length;
    const todayEl = document.getElementById('today-count');
    if (todayEl) {
        const today = getToday();
        todayEl.textContent = '(' + sweeps.filter(s => s.addedDate === today).length + ')';
    }
    const weekEl = document.getElementById('week-count');
    if (weekEl) weekEl.textContent = '(' + sweeps.length + ')';
    const freqStats = document.getElementById('frequency-stats');
    if (freqStats) {
        const counts = { Single: 0, Daily: 0, '24-Hour': 0, Unlimited: 0, Weekly: 0, Monthly: 0, Other: 0 };
        sweeps.forEach(s => {
            const f = s.frequency || 'Single';
            if (counts[f] !== undefined) counts[f]++;
            else counts['Other']++;
        });
        freqStats.innerHTML = `
            <div>Single Entries: <b>${counts.Single}</b></div>
            <div>Daily Entries: <b>${counts.Daily}</b></div>
            <div>Unlimited Entries: <b>${counts.Unlimited}</b></div>
            <div>Weekly Entries: <b>${counts.Weekly}</b></div>
            <div>Monthly Entries: <b>${counts.Monthly}</b></div>
            <div>Other: <b>${counts.Other}</b></div>`;
    }
}

async function loadSweepstakes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const tbody = container.querySelector('tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Loading sweepstakes...</td></tr>';

    let allSweeps = [];

    // Try loading sites_db.json
    try {
        const resp = await fetch('sites_db.json');
        if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data)) {
                allSweeps = data.map(s => ({
                    title: s.title || s.name || 'Untitled',
                    link: s.url || s.link || '#',
                    category: s.category || 'Various',
                    endDate: s.endDate || s.ends || 'Unknown',
                    frequency: s.frequency || s.entryFrequency || 'Single',
                    addedDate: s.addedDate || s.dateAdded || getToday()
                }));
            }
        }
    } catch(e) {
        console.log('sites_db.json not available, trying approved sweeps');
    }

    // Add approved user submissions
    try {
        const approved = JSON.parse(localStorage.getItem('approved_sweeps') || '[]');
        const mapped = approved.map(s => ({
            title: s.title,
            link: s.url,
            category: s.category,
            endDate: s.endDate,
            frequency: s.frequency,
            addedDate: s.approved ? new Date(s.approved).toLocaleDateString('en-US', {month:'2-digit',day:'2-digit',year:'2-digit'}) : getToday()
        }));
        allSweeps = [...mapped, ...allSweeps];
    } catch(e) {}

    // Fallback if empty
    if (allSweeps.length === 0) {
        allSweeps = FALLBACK_SWEEPS;
    }

    // Remove duplicates by title
    const seen = new Set();
    allSweeps = allSweeps.filter(s => {
        const key = s.title.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    renderSweepstakes(allSweeps, containerId);
}

function loadSweepstakesEnding(containerId) {
    loadSweepstakes(containerId);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('rss-feed-table')) loadSweepstakes('rss-feed-table');
    document.getElementById('refresh-feed')?.addEventListener('click', (e) => {
        e.preventDefault();
        loadSweepstakes('rss-feed-table');
    });
});

