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
    if (!data.event_total || !data.entry_name || !data.player_name) {
        console.error("Data is missing required properties:", data);
        return;
    }

    const pointsMap = {};
    const rankOnePoints = data.event_total[data.rank[0]];  // Points of the rank 1 team
    const rankOneTeams = [];

    try {
        // Group teams by their points
        Object.keys(data.event_total).forEach(key => {
            const points = data.event_total[key];
            const teamName = data.entry_name[key];
            const managerName = data.player_name[key];

            if (!pointsMap[points]) {
                pointsMap[points] = [];
            }
            pointsMap[points].push({ teamName, managerName });

            // Identify rank 1 team points
            if (points === rankOnePoints) {
                rankOneTeams.push({ teamName, managerName });
            }
        });

        // If there are multiple teams with the same points as rank 1, they share the win
        if (rankOneTeams.length > 1) {
            const winShare = 1 / rankOneTeams.length;  // Fractional win for rank 1 teams
            rankOneTeams.forEach(({ teamName, managerName }) => {
                if (!teamWins[teamName]) {
                    teamWins[teamName] = 0;
                    teamManagers[teamName] = managerName;
                }
                teamWins[teamName] += winShare;
            });
        } else {
            // Only the rank 1 team gets the full win
            const rankOneTeam = rankOneTeams[0];
            if (!teamWins[rankOneTeam.teamName]) {
                teamWins[rankOneTeam.teamName] = 0;
                teamManagers[rankOneTeam.teamName] = rankOneTeam.managerName;
            }
            teamWins[rankOneTeam.teamName] += 1;
        }

        // Other teams get 0 wins, no need to do anything for them

    } catch (error) {
        console.error("Error processing week data:", error, data);
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
