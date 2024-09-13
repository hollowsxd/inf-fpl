// Initialize the dropdown and content on page load
document.addEventListener('DOMContentLoaded', initializeDropdown);

async function initializeDropdown() {
    const dropdown = document.getElementById('gameweekSelector');
    const tabContents = document.getElementById('tabContents');

    try {
        const latestGameweek = await fetchInitialGameweek();
        
        // Populate dropdown with gameweeks from 1 to the latest
        populateDropdown(dropdown, latestGameweek);

        // Set the dropdown value to the latest gameweek and fetch data for it
        dropdown.value = latestGameweek;
        await fetchGameweekData(latestGameweek);
        
    } catch (error) {
        console.error('Error initializing gameweek:', error);
        dropdown.value = 1; // Fallback to the first gameweek if there's an error
        await fetchGameweekData(1);
    }

    // Handle gameweek changes
    dropdown.addEventListener('change', async (event) => {
        await fetchGameweekData(event.target.value);
    });
}

// Populate the dropdown with gameweek options up to the latest gameweek
function populateDropdown(dropdown, latestGameweek) {
    const fragment = document.createDocumentFragment(); // Create a DocumentFragment

    for (let week = 1; week <= latestGameweek; week++) {
        const option = document.createElement('option');
        option.value = week;
        option.textContent = `Gameweek ${week}`;
        fragment.appendChild(option); // Append each option to the fragment
    }

    dropdown.appendChild(fragment); // Append the fragment to the dropdown once
}

// Fetch the initial gameweek from gw.txt
async function fetchInitialGameweek() {
    try {
        const response = await fetch('data/latestgw.txt');
        const text = await response.text();
        const match = text.match(/Gameweek (\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        } else {
            throw new Error('Invalid content in gw.txt');
        }
    } catch (error) {
        console.error('Error fetching gw.txt:', error);
        throw error;
    }
}

// Fetch and display data for the selected gameweek
async function fetchGameweekData(week) {
    const url = `data/Gameweek ${week} Weekly.json`; // URL to fetch JSON data for the selected gameweek
    showLoadingMessage();
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        const results = processData(data);
        displayLeaderboard(results);
    } catch (error) {
        console.error(`Error fetching data for Gameweek ${week}:`, error);
        showError(`Error loading data for Gameweek ${week}.`);
    }
}

// Process raw JSON data into a format suitable for the leaderboard
function processData(data) {
    return Object.keys(data.rank).map(index => ({
        rank: data.rank[index],
        entry_name: data.entry_name[index],
        player_name: data.player_name[index],
        total: data.event_total[index]
    }));
}

// Display leaderboard data in the content area
function displayLeaderboard(results) {
    const content = document.getElementById('tabContents');
    content.innerHTML = generateLeaderboardData(results); // Populate content with leaderboard only
}

// Generate leaderboard table HTML based on the results
function generateLeaderboardData(results) {
    const rows = results.map((team) => {
        const medal = team.rank === 1 ? '🥇' : (team.rank === 2 ? '🥈' : (team.rank === 3 ? '🥉' : ''));
        return `
            <tr>
                <td>${medal}</td>
                <td class="team-info">
                    <span class="team-name ${team.rank <= 3 ? 'top-team' : ''}">${team.entry_name}</span>
                    <div class="manager-name">${team.player_name}</div>
                </td>
                <td class="points">${team.total}</td>
            </tr>
        `;
    }).join('');

    return `
    <h1>Gameweek ${week} Winners</h1>
        <table class="leaderboard-table">
            <thead>
                <tr><th>Rank</th><th>Team</th><th>Points</th></tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

// Show loading message while fetching data
function showLoadingMessage() {
    const content = document.getElementById('tabContents');
    content.innerHTML = '<p>Loading data...</p>';
}

// Show error message if data fetching fails
function showError(message) {
    const content = document.getElementById('tabContents');
    content.innerHTML = `<p>${message}</p>`;
}
