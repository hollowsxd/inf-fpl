// Function to initialize dropdown and content
function initializeDropdown() {
    const dropdown = document.getElementById('gameweekSelector');
    const tabContents = document.getElementById('tabContents');
    
    // Updated list of gameweeks from 1 to 38
    const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);

    gameweeks.forEach(week => {
        const option = document.createElement('option');
        option.value = week;
        option.textContent = `Gameweek ${week}`;
        dropdown.appendChild(option);
    });

    // Set default option and fetch data for the first gameweek
    dropdown.value = gameweeks[0];
    fetchGameweekData(gameweeks[0]);

    // Add event listener to handle gameweek changes
    dropdown.addEventListener('change', (event) => {
        fetchGameweekData(event.target.value);
    });
}

// Function to fetch and display data for the selected gameweek
function fetchGameweekData(week) {
    const url = `data/Gameweek ${week} Weekly.json`; // URL to fetch JSON data for the selected gameweek
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const results = processData(data);
            const content = document.getElementById('tabContents');
            content.innerHTML = generateLeaderboardData(results); // Populate content with leaderboard only
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            const content = document.getElementById('tabContents');
            content.innerHTML = `<p>Error loading data for Gameweek ${week}.</p>`;
        });
}

// Function to process raw JSON data into a format suitable for the leaderboard
function processData(data) {
    return Object.keys(data.rank).map(index => ({
        rank: data.rank[index],
        entry_name: data.entry_name[index],
        player_name: data.player_name[index],
        total: data.event_total[index]
    }));
}

// Function to generate leaderboard table HTML based on the results
function generateLeaderboardData(results) {
    let html = '<table class="leaderboard-table"><thead><tr><th>Rank</th><th>Team</th><th>Points</th></tr></thead><tbody>';
    results.forEach((team, index) => {
        const medal = team.rank === 1 ? '🥇' : (team.rank === 2 ? '🥈' : (team.rank === 3 ? '🥉' : ''));
        html += `<tr>
                    <td>${medal}</td>
                    <td class="team-info"><span class="team-name ${team.rank <= 3 ? 'top-team' : ''}">${team.entry_name}</span><div class="manager-name">${team.player_name}</div></td>
                    <td class="points">${team.total}</td>
                 </tr>`;
    });
    html += '</tbody></table>';
    return html;
}

// Initialize dropdown and fetch data on page load
document.addEventListener('DOMContentLoaded', initializeDropdown);
