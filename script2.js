// Base URL for the JSON files and latest gameweek text file
const baseUrl = 'https://raw.githubusercontent.com/hollowsxd/inf-fpl/main/data/Gameweek '; // Base URL for the JSON files
const fileSuffix = ' Weekly.json'; // Suffix for the JSON files
const latestGwUrl = 'https://raw.githubusercontent.com/hollowsxd/inf-fpl/main/data/latestgw.txt'; // URL to the latest gameweek text file

// Function to fetch data from a URL
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

// Function to get the latest gameweek number
async function getLatestGameweek() {
    try {
        const text = await fetchData(latestGwUrl, false);
        const match = text.match(/Gameweek (\d+)/); // Extract the latest gameweek number
        if (!match) throw new Error('Failed to parse the latest gameweek number.');
        return parseInt(match[1], 10);
    } catch (error) {
        console.error('Error getting latest gameweek:', error);
        return null;
    }
}

// Function to count wins and collect manager names across multiple weeks
async function countWins(startWeek, endWeek) {
    const teamWins = {};
    const teamManagers = {};
    const fetchPromises = [];

    for (let week = startWeek; week <= endWeek; week++) {
        const url = `${baseUrl}${week}${fileSuffix}`;
        fetchPromises.push(fetchData(url).then(data => ({ data, gameweek: week })));
    }

    try {
        // Fetch all gameweek data in parallel
        const allGameweekData = await Promise.all(fetchPromises);

        // Process each gameweek data
        allGameweekData.forEach(({ data, gameweek }) => {
            if (data) {
                processWeekData(data, teamWins, teamManagers, gameweek);
            }
        });

        // Display the results
        await displayResults(teamWins, teamManagers);
    } catch (error) {
        console.error("Error fetching or processing gameweek data:", error);
    }
}

// Function to process week data and count wins
function processWeekData(data, teamWins, teamManagers, gameweek) {
    if (!data.event_total || !data.entry_name || !data.player_name) {
        console.error("Data is missing required properties:", data);
        return;
    }

    try {
        // Find the maximum points in event_total
        const maxPoints = Math.max(...Object.values(data.event_total));

        // Collect all teams with the maximum points
        const tiedTeams = [];
        for (const key in data.event_total) {
            if (data.event_total[key] === maxPoints) {
                tiedTeams.push(key);
            }
        }

        const winShare = 1 / tiedTeams.length; // Fractional win for each tied team

        // Award wins to all tied teams
        tiedTeams.forEach(key => {
            const teamName = data.entry_name[key];
            const managerName = data.player_name[key];

            // Initialize team wins and manager if not already present
            if (!teamWins[teamName]) {
                teamWins[teamName] = { wins: 0, gameweeks: [] };
                teamManagers[teamName] = managerName;
            }

            // Increment the win count by the fractional value and store the gameweek
            teamWins[teamName].wins += winShare;
            teamWins[teamName].gameweeks.push(gameweek);
        });
    } catch (error) {
        console.error("Error processing week data:", error, data);
    }
}

// Function to display results in the HTML table
async function displayResults(teamWins, teamManagers) {
    const latestGameweek = await getLatestGameweek()
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
                ${generateTableRows(teamWins, teamManagers)}
            </tbody>
        </table>
    `;
}

// Function to generate table rows from the team wins data
function generateTableRows(teamWins, teamManagers) {
    return Object.entries(teamWins)
        .sort(([, aWins], [, bWins]) => bWins.wins - aWins.wins) // Sort by number of wins descending
        .map(([team, { wins, gameweeks }], index) => `
            <tr>
                <td>${index < 3 ? getMedalEmoji(index) : index + 1}</td>
                <td class="team-info">
                    <span class="team-name ${index < 3 ? 'top-team' : ''}">${team}</span>
                    <div class="manager-name">${teamManagers[team]}</div>
                </td>
                <td class="points" 
                    title="Gameweeks: ${gameweeks.join(', ')}" 
                    onmouseover="showTooltip(event, 'Gameweeks: ${gameweeks.join(', ')}')" 
                    onmouseout="hideTooltip()" 
                    ontouchstart="showTooltip(event, 'Gameweeks: ${gameweeks.join(', ')}')" 
                    ontouchend="hideTooltip()">${wins}</td>
            </tr>
        `).join('');
}

// Function to show tooltip
function showTooltip(event, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerText = text;
    document.body.appendChild(tooltip);

    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY}px`;

    // Store the tooltip element in the target element for later removal
    event.target._tooltip = tooltip;
}

// Function to hide tooltip
function hideTooltip(event) {
    const tooltip = event.target && event.target._tooltip;
    if (tooltip) {
        tooltip.remove();
        event.target._tooltip = null;
    }
}

// Function to get medal emoji based on rank
function getMedalEmoji(rank) {
    return ['🥇', '🥈', '🥉'][rank] || '';
}

// Function to load and display the leaderboard when the button is clicked
async function loadLeaderboard() {
    const latestGameweek = await getLatestGameweek();
    showLoadingMessage();
    if (latestGameweek !== null) {
        countWins(1, latestGameweek); // Scan weeks from 1 to the latest gameweek
    } else {
        console.error('Unable to determine the latest gameweek.');
    }
}

// Show loading message while fetching data
function showLoadingMessage() {
    const content = document.getElementById('tabContents');
    content.innerHTML = '<p>Loading data...</p>';
}

// Attach event listener to the button
document.getElementById('topwins').addEventListener('click', loadLeaderboard);
