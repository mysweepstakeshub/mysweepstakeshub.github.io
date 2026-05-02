javascript
/* === MY SWEEPSTAKES HUB - RSS FEED AGGREGATOR v3 === */

// Multiple proxies to try
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
];

// RSS feeds
const RSS_FEEDS = [
    { name: 'Contest Bee', url: 'https://www.contestbee.com/sweepstakes-and-contests/feed/', category: 'Various' },
    { name: 'Sweepstakes Fanatics', url: 'https://www.sweepstakesfanatics.com/feed/', category: 'Various' },
    { name: 'Contest Girl', url: 'https://www.contestgirl.com/feed', category: 'Various' }
];

const CACHE_KEY = 'sweepstakes_rss_cache';
const CACHE_TIME = 60 * 60 * 1000; // 1 hour

// Fallback demo sweeps if RSS fails
const FALLBACK_SWEEPS = [
    { title: 'Win a $1,000 Amazon Gift Card', link: 'https://www.amazon.com', category: 'Gift Cards', endDate: '06/30/26', frequency: 'Daily', addedDate: '05/02/26', source: 'Demo' },
    { title: '$5,000 Home Depot Shopping Spree', link: 'https://www.homedepot.com', category: 'Home & Garden', endDate: '07/15/26', frequency: 'Single', addedDate: '05/02/26', source: 'Demo' },
    { title: 'Trip for 2 to Las Vegas', link: '#', category: 'Travel', endDate: '06/15/26', frequency: 'Daily', addedDate: '05/01/26', source: 'Demo' },
    { title: 'Win the New iPhone 17 Pro', link: '#', category: 'Electronics', endDate: '08/01/26', frequency: 'Single', addedDate: '05/02/26', source: 'Demo' },
    { title: '$500 Target Gift Card Giveaway', link: '#', category: 'Gift Cards', endDate: '05/31/26', frequency: 'Daily', addedDate: '04/30/26', source: 'Demo' },
    { title: 'Year Supply of Starbucks Coffee', link: '#', category: 'Food & Drink', endDate: '07/01/26', frequency: 'Monthly', addedDate: '05/01/26', source: 'Demo' },
    { title: 'Disney World Family Vacation Package', link: '#', category: 'Travel', endDate: '09/30/26', frequency: 'Single', addedDate: '04/29/26', source: 'Demo' },
    { title: 'MacBook Pro + AirPods Bundle', link: '#', category: 'Electronics', endDate: '06/30/26', frequency: 'Daily', addedDate: '05/02/26', source: 'Demo' },
    { title: '$2,500 Fashion Shopping Spree', link: '#', category: 'Fashion', endDate: '06/22/26', frequency: 'Single', addedDate: '04/28/26', source: 'Demo' },
    { title: 'Ultimate Gaming Setup Giveaway', link: '#', category: 'Electronics', endDate: '07/15/26', frequency: 'Weekly', addedDate: '05/01/26', source: 'Demo' }
];

function parseRSS(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const items = xml.querySelectorAll('item');
    const sweeps = [];
    items.forEach(item => {
        const title = item.querySelector('title')?.textContent || 'No Title';
        const link = item.querySelector('link')?.textContent || '#';
        const description = item.querySelector('description')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const category = item.querySelector('category')?.textContent || 'Various';
        let endDate = '';
        const endMatch = description.match(/Ends?\s*:?\s*([A-Z][a-z]+ \d{1,2},? \d{4})/i) || description.match(/([A-Z][a-z]+ \d{1,2},? \d{4})/i);
        if (endMatch) endDate = endMatch[1];
        let frequency = 'Single';
        const descLower = description.toLowerCase();
        if (descLower.includes('daily entry') || descLower.includes('enter daily')) frequency = 'Daily';
        else if (descLower.includes('weekly')) frequency = 'Weekly';
        else if (descLower.includes('monthly')) frequency = 'Monthly';
        else if (descLower.includes('unlimited')) frequency = 'Unlimited';
        let formattedDate = '';
        if (pubDate) {
            const d = new Date(pubDate);
            if (!isNaN(d.getTime())) formattedDate = (d.getMonth()+1).toString().padStart(2,'0')+'/'+d.getDate().toString().padStart(2,'0')+'/'+d.getFullYear().toString().slice(2);
        }
        let formattedEnd = '';
        if (endDate) {
            const d = new Date(endDate);
            if (!isNaN(d.getTime())) formattedEnd = (d.getMonth()+1).toString().padStart(2,'0')+'/'+d.getDate().toString().padStart(2,'0')+'/'+d.getFullYear().toString().slice(2);
        }
        sweeps.push({
            title: title.replace(/&#8220;/g,'"').replace(/&#8221;/g,'"').replace(/&#8217;/g,"'").replace(/&amp;/g,'&'),
            link, category, endDate: formattedEnd || 'Unknown', frequency,
            addedDate: formattedDate || 'Recent',
            description: description.replace(/<[^>]*>/g,'').substring(0,200)+'...'
        });
    });
    return sweeps;
}

async function fetchFeedWithProxy(feed, proxy) {
    try {
        const proxyUrl = proxy + encodeURIComponent(feed.url);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Bad response');
        const text = await response.text();
        const sweeps = parseRSS(text);
        sweeps.forEach(s => s.source = feed.name);
        return sweeps;
    } catch (err) {
        throw err;
    }
}

async function fetchFeed(feed) {
    for (const proxy of CORS_PROXIES) {
        try {
            return await fetchFeedWithProxy(feed, proxy);
        } catch (e) {
            continue;
        }
    }
    return [];
}

async function fetchAllFeeds() {
    const allSweeps = [];
    const results = await Promise.allSettled(RSS_FEEDS.map(feed => fetchFeed(feed)));
    results.forEach(result => {
        if (result.status === 'fulfilled') allSweeps.push(...result.value);
    });
    if (allSweeps.length === 0) {
        console.warn('All RSS feeds failed, using fallback data');
        return FALLBACK_SWEEPS;
    }
    allSweeps.sort((a, b) => {
        const dateA = new Date(a.pubDate || 0);
        const dateB = new Date(b.pubDate || 0);
        return dateB - dateA;
    });
    return allSweeps;
}

function renderSweepstakes(sweeps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const tableBody = container.querySelector('tbody');
    if (!tableBody) return;
    if (sweeps.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No sweepstakes available. <a href="submit.html">Submit one!</a></td></tr>';
        return;
    }
    let html = '';
    sweeps.forEach((sweep, index) => {
        const rowClass = index % 2 === 0 ? '' : 'row-alt';
        html += `<tr class="${rowClass}">
            <td><a href="${sweep.link}" target="_blank" rel="noopener">${sweep.title}</a></td>
            <td><a href="category.html">${sweep.category}</a></td>
            <td>${sweep.endDate}</td>
            <td>${sweep.frequency}</td>
            <td>${sweep.addedDate}</td>
        </tr>`;
    });
    tableBody.innerHTML = html;
    updateStats(sweeps);
}

function updateStats(sweeps) {
    const countEl = document.getElementById('sweeps-count');
    if (countEl) countEl.textContent = sweeps.length.toLocaleString();
    const totalEl = document.getElementById('total-sweeps');
    if (totalEl) totalEl.textContent = sweeps.length.toLocaleString();
    const todayCount = document.getElementById('today-count');
    if (todayCount) todayCount.textContent = '(' + sweeps.filter(s => s.addedDate === 'Recent').length + ')';
    const freqStats = document.getElementById('frequency-stats');
    if (freqStats && sweeps.length > 0) {
        const counts = { Single: 0, Daily: 0, '24-Hour': 0, Unlimited: 0, Weekly: 0, Monthly: 0, Other: 0, Unknown: 0 };
        sweeps.forEach(s => {
            const f = s.frequency;
            if (counts[f] !== undefined) counts[f]++;
            else counts['Other']++;
        });
        freqStats.innerHTML = `<div>Single Entries: <b>${counts.Single}</b></div>
            <div>Daily Entries: <b>${counts.Daily}</b></div>
            <div>24-Hour Entries: <b>${counts['24-Hour']}</b></div>
            <div>Unlimited Entries: <b>${counts.Unlimited}</b></div>
            <div>Weekly Entries: <b>${counts.Weekly}</b></div>
            <div>Monthly Entries: <b>${counts.Monthly}</b></div>
            <div>Other: <b>${counts.Other}</b></div>
            <div>Unknown: <b>${counts.Unknown}</b></div>`;
    }
}

async function loadSweepstakes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const tableBody = container.querySelector('tbody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">⏳ Loading sweepstakes...</td></tr>';

    // Try cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TIME && data.length > 0) {
            renderSweepstakes(data, containerId);
            return;
        }
    }

    // Fetch live
    const sweeps = await fetchAllFeeds();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: sweeps, timestamp: Date.now() }));
    renderSweepstakes(sweeps, containerId);
}

function loadSweepstakesEnding(containerId) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { data } = JSON.parse(cached);
        const ending = data
            .filter(s => s.endDate !== 'Unknown')
            .sort((a, b) => (a.endDate||'').localeCompare(b.endDate||''))
            .slice(0, 25);
        renderSweepstakes(ending, containerId);
    } else {
        loadSweepstakes(containerId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('rss-feed-table')) loadSweepstakes('rss-feed-table');
    document.getElementById('refresh-feed')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem(CACHE_KEY);
        loadSweepstakes('rss-feed-table');
    });
});
