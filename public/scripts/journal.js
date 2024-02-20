function showContent(id) {
    // Get all content divs
    var contentDivs = document.getElementsByClassName('content');

    // Hide all content divs
    for (var i = 0; i < contentDivs.length; i++) {
        contentDivs[i].style.display = 'none';
    }

    // Show the content div corresponding to the clicked button
    var targetContent = document.getElementById(id);
    targetContent.style.display = 'block';
}

function confirmJournalSubmission() {
    // Display a confirmation dialog
    const confirmed = confirm('Are you sure you want to submit this journal entry?');

    if (confirmed) {
        // If submission is confirmed, show the success alert
        alert('Journal entry submitted successfully!');
    }

    return confirmed;
}

// Function to delete a journal entry
function deleteJournalEntry(index) {
    // Get the journal entry ID from the DOM (assuming you store the ID in a hidden span element)
    const entryId = document.querySelector(`.journal-entry[data-index="${index}"] .entry-id`).textContent;
    // console.log(`Entry ID: ${entryId}`);

    // Send a DELETE request to the server
    fetch('/journal-delete', {
        method: 'POST', // Change method to POST
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entryId: entryId })
    })
        .then(response => {

            if (!response.ok) {
                throw new Error('Failed to delete journal entry');
            }
            // Notify user about successful deletion
            alert('Journal entry deleted successfully');
            // Reload the page after deleting the entry
            location.reload(); // Reload the page
        })
        .catch(error => {
            // Notify user about error
            alert('Error deleting journal entry');
            console.error('Error deleting journal entry:', error);
            // Handle error
        });
}





// Function to generate formatted date
function getFormattedDate(timestamp) {
    const entryDate = new Date(timestamp);
    return `${entryDate.getDate()} ${entryDate.toLocaleString('default', { month: 'long' })} ${entryDate.getFullYear()}`;
}

// Function to create chart
function createChart(user) {
    const dates = [];
    const moods = [];
    if (user.journal && user.journal.length > 0) {
        user.journal.reverse().forEach(entry => {
            dates.push(getFormattedDate(entry.timestamp));
            moods.push(entry.mood);
        });
    }

    var ctx = document.getElementById('moodChart').getContext('2d');
    var moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Mood',
                data: moods,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}





