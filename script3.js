//const baseUrl = 'https://raw.githubusercontent.com/hollowsxd/inf-fpl/main/data/Gameweek ';
//const fileSuffix = ' Weekly.json';
//const latestGwUrl = 'https://raw.githubusercontent.com/hollowsxd/inf-fpl/main/data/latestgw.txt';

async function fetchData(url, isJson = true) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return isJson ? response.json() : response.text();
}

async function getLatestGameweek() {
    const text = await fetchData(latestGwUrl, false);
    const match = text.match(/Gameweek (\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

async function calculateNetBalance(startWeek, endWeek) {
    const teamData = {}; // { teamName: { manager, winnings, count, wins } }
    const fetchPromises = [];

    for (let week = startWeek; week <= endWeek; week++) {
        const url = `${baseUrl}${week}${fileSuffix}`;
        fetchPromises.push(fetchData(url).then(data => ({ data, gameweek: week })));
    }

    const allData = await Promise.all(fetchPromises);

    allData.forEach(({ data }) => {
        const maxPoints = Math.max(...Object.values(data.event_total));
        const tiedKeys = Object.keys(data.event_total).filter(
            key => data.event_total[key] === maxPoints
        );
        
        const share = 75 / tiedKeys.length;

        for (const key in data.entry_name) {
            const team = data.entry_name[key];
            const manager = data.player_name[key];

            if (!teamData[team]) {
                teamData[team] = { manager, winnings: 0, count: 0, wins: 0 };
            }

            teamData[team].count += 1;

            if (tiedKeys.includes(key)) {
                const winShare = 1 / tiedKeys.length;
                teamData[team].winnings += share;
                teamData[team].wins += winShare;
            }
        }
    });

    displayNetBalance(teamData, endWeek);
}

function displayNetBalance(teamData, totalWeeks) {
    const container = document.getElementById('tabContents');
    container.innerHTML = `
    <h1>Net Profit & Loss (After ${totalWeeks} Gameweeks)</h1>
    <table class="leaderboard-table">
        <thead>
            <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>GW Played</th>
                <th>GW Won</th>
                <th>Total RM Won</th>
                <th>Total RM Paid</th>
                <th>Net Balance (RM)</th>
            </tr>
        </thead>
        <tbody>
            ${generateNetBalanceRows(teamData)}
        </tbody>
    </table>`;
}

function generateNetBalanceRows(teamData) {
    const entries = Object.entries(teamData).map(([team, data]) => {
        const totalPaid = data.count * 5;
        const netBalance = data.winnings - totalPaid;
        return {
            team,
            manager: data.manager,
            count: data.count,
            wins: data.wins,
            winnings: data.winnings,
            paid: totalPaid,
            net: netBalance
        };
    });

    return entries
        .sort((a, b) => b.net - a.net)
        .map((entry, index) => `
            <tr>
                <td>${index < 3 ? getMedalEmoji(index) : index + 1}</td>
                <td class="team-info">
                    <span class="team-name ${index < 3 ? 'top-team' : ''}">${entry.team}</span>
                    <div class="manager-name">${entry.manager}</div>
                </td>
                <td>${entry.count}</td>
                <td>${entry.wins}</td>
                <td class="points profit">RM ${entry.winnings.toFixed(2)}</td>
                <td class="points loss">RM ${entry.paid.toFixed(2)}</td>
                <td class="points ${entry.net >= 0 ? 'profit' : 'loss'}">
                    RM ${entry.net.toFixed(2)}
                </td>
            </tr>
        `).join('');
}

function getMedalEmoji(rank) {
    return ['🥇', '🥈', '🥉'][rank] || '';
}

async function loadNetBalanceLeaderboard() {
    const latest = await getLatestGameweek();
    showLoadingMessage();
    if (latest !== null) {
        calculateNetBalance(1, latest);
    }
}

function showLoadingMessage() {
    const content = document.getElementById('tabContents');
    content.innerHTML = '<p>Calculating profit/loss...</p>';
}

document.getElementById('winnings').addEventListener('click', loadNetBalanceLeaderboard);
