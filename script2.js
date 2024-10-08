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

    const fetchPromises = []; // Array to hold promises for fetching data

    for (let week = startWeek; week <= endWeek; week++) {
        const url = `${baseUrl}${week}${fileSuffix}`;
        fetchPromises.push(fetchData(url).then(data => processWeekData(data, teamWins, teamManagers)).catch(error => console.error(`Error processing ${url}:`, error)));
    }

    // Wait for all fetches to complete
    await Promise.all(fetchPromises);

    // Display the results in a table
    displayResults(teamWins, teamManagers);
}

// Function to process data for a specific week
function processWeekData(data, teamWins, teamManagers) {
    if (data.rank && data.entry_name && data.player_name) {
        Object.keys(data.rank).forEach(key => {
            const rank = data.rank[key];
            const teamName = data.entry_name[key];
            const managerName = data.player_name[key];

            // Initialize the team entry if it does not exist
            if (!teamWins[teamName]) {
                teamWins[teamName] = 0;
                teamManagers[teamName] = managerName;
            }

            if (rank === 1) teamWins[teamName] += 1; // Count this team as a win for being ranked 1
        });
    } else {
        console.error('Data format is incorrect:', data);
    }
}

// Function to display results in the HTML table
function displayResults(teamWins, teamManagers) {
    const resultsDiv = document.getElementById('tabContents');
    if (!resultsDiv) {
        console.error('Results container not found in the DOM.');
        return;
    }

    resultsDiv.innerHTML = `
    <h1>Most Wins By Team</h1>
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
        .sort(([, aWins], [, bWins]) => bWins - aWins) // Sort by number of wins descending
        .map(([team, wins], index) => `
            <tr>
                <td>${index < 3 ? getMedalEmoji(index) : index + 1}</td>
                <td class="team-info">
                    <span class="team-name ${index < 3 ? 'top-team' : ''}">${team}</span>
                    <div class="manager-name">${teamManagers[team]}</div>
                </td>
                <td class="points">${wins}</td>
            </tr>
        `).join('');
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
