// Base URL for the JSON files and latest gameweek text file
const baseUrl = 'https://raw.githubusercontent.com/hollowsxd/inf-fpl/main/data/2526/Gameweek ';
const fileSuffix = ' Weekly.json';
const latestGwUrl = 'https://raw.githubusercontent.com/hollowsxd/inf-fpl/main/data/latestgw.txt';

// Fetch data from a URL
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

// Get the latest gameweek number
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

// Count wins and collect manager names across multiple weeks
async function countWins(startWeek, endWeek) {
    const teamWins = {};
    const teamManagers = {};
    const tiedGameweekColors = {};
    let colorIndex = 0;
    const fetchPromises = [];

    for (let week = startWeek; week <= endWeek; week++) {
        const url = `${baseUrl}${week}${fileSuffix}`;
        fetchPromises.push(fetchData(url).then(data => ({ data, gameweek: week })));
    }

    try {
        const allGameweekData = await Promise.all(fetchPromises);

        allGameweekData.forEach(({ data, gameweek }) => {
            if (data) {
                processWeekData(data, teamWins, teamManagers, gameweek, tiedGameweekColors, () => colorIndex++);
            }
        });

        await displayResults(teamWins, teamManagers, tiedGameweekColors);
    } catch (error) {
        console.error("Error fetching or processing gameweek data:", error);
    }
}

// Process week data and count wins/ties
function processWeekData(data, teamWins, teamManagers, gameweek, tiedGameweekColors, incrementColorIndex) {
    if (!data.event_total || !data.entry_name || !data.player_name) {
        console.error("Data is missing required properties:", data);
        return;
    }

    try {
        const maxPoints = Math.max(...Object.values(data.event_total));
        const tiedTeams = [];

        for (const key in data.event_total) {
            if (data.event_total[key] === maxPoints) {
                tiedTeams.push(key);
            }
        }

        const isTied = tiedTeams.length > 1;
        if (isTied) {
            const colorHue = (incrementColorIndex() * 57) % 360;
            tiedGameweekColors[gameweek] = `hsl(${colorHue}, 70%, 60%)`;
        }

        tiedTeams.forEach(key => {
            const teamName = data.entry_name[key];
            const managerName = data.player_name[key];

            if (!teamWins[teamName]) {
                teamWins[teamName] = { wins: 0, solo: 0, tied: 0, gameweeks: [] };
                teamManagers[teamName] = managerName;
            }

            teamWins[teamName].wins += 1 / tiedTeams.length;
            teamWins[teamName].gameweeks.push(gameweek);

            if (isTied) {
                teamWins[teamName].tied += 1;
            } else {
                teamWins[teamName].solo += 1;
            }
        });
    } catch (error) {
        console.error("Error processing week data:", error, data);
    }
}

// Display results in table
async function displayResults(teamWins, teamManagers, tiedGameweekColors) {
    const latestGameweek = await getLatestGameweek();
    const resultsDiv = document.getElementById('tabContents');
    if (!resultsDiv) {
        console.error('Results container not found in the DOM.');
        return;
    }

    resultsDiv.innerHTML = `
    <h1>Most Wins By Team as of Gameweek ${latestGameweek}</h1>
    <table class="leaderboard-table">
        <thead>
            <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Number of Wins</th>
            </tr>
        </thead>
        <tbody>
            ${generateTableRows(teamWins, teamManagers, tiedGameweekColors)}
        </tbody>
    </table>
    `;
}

// Generate table rows
function generateTableRows(teamWins, teamManagers, tiedGameweekColors) {
    return Object.entries(teamWins)
        .sort(([, aWins], [, bWins]) => bWins.wins - aWins.wins)
        .map(([team, { wins, gameweeks }], index) => `
            <tr onclick='showModal("${team}", ${JSON.stringify(gameweeks)}, ${JSON.stringify(tiedGameweekColors)})'>
                <td>${index < 3 ? getMedalEmoji(index) : index + 1}</td>
                <td class="team-info">
                    <span class="team-name ${index < 3 ? 'top-team' : ''}">${team}</span>
                    <div class="manager-name">${teamManagers[team]}</div>
                </td>
                <td class="points">${wins.toFixed(2)}</td>
            </tr>
        `).join('');
}

// Show modal with colored tied gameweeks
function showModal(team, gameweeks, tiedGameweekColors) {
    const modal = document.getElementById('gameweekModal');
    const modalGameweeks = document.getElementById('modalGameweeks');

    const coloredWeeks = gameweeks.map(gw => {
        const color = tiedGameweekColors[gw];
        return color
            ? `<span style="color:${color}; font-weight:bold;">${gw}</span>`
            : `<span>${gw}</span>`;
    });

    modalGameweeks.innerHTML = `<strong>${team}</strong><br>Gameweeks won: ${coloredWeeks.join(', ')}`;
    modal.style.display = "block";
}

// Close modal
function closeModal() {
    document.getElementById('gameweekModal').style.display = "none";
}

// Click close span
document.querySelector('.close').onclick = function () {
    closeModal();
};

// Close modal if clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('gameweekModal');
    if (event.target == modal) {
        closeModal();
    }
};

// Medal emoji
function getMedalEmoji(rank) {
    return ['🥇', '🥈', '🥉'][rank] || '';
}

// Load leaderboard
async function loadLeaderboard() {
    const latestGameweek = await getLatestGameweek();
    showLoadingMessage();
    if (latestGameweek !== null) {
        countWins(1, latestGameweek);
    } else {
        console.error('Unable to determine the latest gameweek.');
    }
}

// Loading message
function showLoadingMessage() {
    const content = document.getElementById('tabContents');
    content.innerHTML = '<p>Loading data...</p>';
}

// Event listener
document.getElementById('topwins').addEventListener('click', loadLeaderboard);
