const bUrl = 'https://raw.githubusercontent.com/hollowsxd/inf-fpl/main/data/Gameweek ';
const fileSuffix = ' Weekly.json';
const latestGwUrl = 'https://raw.githubusercontent.com/hollowsxd/inf-fpl/main/data/latestgw.txt';

// Fetch JSON or text data
async function fetchData(url, isJson = true) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch data from ${url}`);
        return isJson ? response.json() : response.text();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Get latest gameweek number
async function getLatestGameweek() {
    try {
        const text = await fetchData(latestGwUrl, false);
        const match = text.match(/Gameweek (\d+)/);
        if (!match) throw new Error('Failed to parse the latest gameweek number.');
        return parseInt(match[1], 10);
    } catch (error) {
        console.error('Error getting latest gameweek:', error);
        return null;
    }
}

// Count net winnings across gameweeks
async function countNetWinnings(startWeek, endWeek) {
    const teamNetWinnings = {};
    const teamManagers = {};
    const fetchPromises = [];

    for (let week = startWeek; week <= endWeek; week++) {
        const url = `${bUrl}${week}${fileSuffix}`;
        fetchPromises.push(fetchData(url).then(data => ({ data, gameweek: week })));
    }

    try {
        const allGameweekData = await Promise.all(fetchPromises);

        allGameweekData.forEach(({ data, gameweek }) => {
            if (data) {
                processWeekForNetWinnings(data, teamNetWinnings, teamManagers);
            }
        });

        await displayNetWinnings(teamNetWinnings, teamManagers);
    } catch (error) {
        console.error("Error fetching or processing gameweek data:", error);
    }
}

// Process single week for net winnings
function processWeekForNetWinnings(data, teamNetWinnings, teamManagers) {
    if (!data.event_total || !data.entry_name || !data.player_name) {
        console.error("Missing required properties in data:", data);
        return;
    }

    const maxPoints = Math.max(...Object.values(data.event_total));
    const tiedTeams = [];

    for (const key in data.event_total) {
        if (data.event_total[key] === maxPoints) {
            tiedTeams.push(key);
        }
    }

    const share = 75 / tiedTeams.length;
    const costPerTeam = 5;
    const netShare = share - costPerTeam;

    tiedTeams.forEach(key => {
        const teamName = data.entry_name[key];
        const managerName = data.player_name[key];

        if (!teamNetWinnings[teamName]) {
            teamNetWinnings[teamName] = 0;
            teamManagers[teamName] = managerName;
        }

        teamNetWinnings[teamName] += netShare;
    });
}

// Display net winnings in table
async function displayNetWinnings(teamNetWinnings, teamManagers) {
    const latestGameweek = await getLatestGameweek();
    const container = document.getElementById('tabContents');
    if (!container) return;

    container.innerHTML = `
    <h1>Net Winnings by Team as of Gameweek ${latestGameweek}</h1>
    <table class="leaderboard-table">
        <thead>
            <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Net Winnings (RM)</th>
            </tr>
        </thead>
        <tbody>
            ${generateNetRows(teamNetWinnings, teamManagers)}
        </tbody>
    </table>
    `;
}

// Generate HTML rows
function generateNetRows(teamNetWinnings, teamManagers) {
    return Object.entries(teamNetWinnings)
        .sort(([, a], [, b]) => b - a)
        .map(([team, winnings], index) => `
            <tr>
                <td>${index < 3 ? getMedalEmoji(index) : index + 1}</td>
                <td class="team-info">
                    <span class="team-name ${index < 3 ? 'top-team' : ''}">${team}</span>
                    <div class="manager-name">${teamManagers[team]}</div>
                </td>
                <td class="points">RM ${winnings.toFixed(2)}</td>
            </tr>
        `).join('');
}

function getMedalEmoji(rank) {
    return ['🥇', '🥈', '🥉'][rank] || '';
}

// Load on button click
async function loadNetWinningsLeaderboard() {
    const latestGameweek = await getLatestGameweek();
    showLoadingMessage();
    if (latestGameweek !== null) {
        countNetWinnings(1, latestGameweek);
    } else {
        console.error('Unable to determine the latest gameweek.');
    }
}

function showLoadingMessage() {
    const content = document.getElementById('tabContents');
    content.innerHTML = '<p>Loading net winnings...</p>';
}

document.getElementById('winnings').addEventListener('click', loadNetWinningsLeaderboard);
