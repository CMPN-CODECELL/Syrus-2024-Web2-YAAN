document.addEventListener('DOMContentLoaded', function () {
  // Mock user data
  const user = JSON.parse(document.getElementById('userData').dataset.user);
  let scores = user.scores
  console.log(user.username)

  // Add this function to download the CSV file
  function downloadCsvForLastGameRangeOfMovement() {
    const filteredScores = user.scores.filter(score => score.gameType === "hand");
    const latestDate = new Date(Math.max(...filteredScores.map(score => score.timestamp.getTime())));
    const latestDateFormatted = `${latestDate.getDate()} ${latestDate.toLocaleString('default', { month: 'long' })} ${latestDate.getFullYear()}`;

    const latestDateScores = filteredScores.filter(score => {
      const scoreDate = new Date(score.timestamp);
      return (
        scoreDate.toDateString() === latestDate.toDateString()
      );
    });

    if (!latestDateScores || latestDateScores.length === 0) {
      alert('No data available for the latest day.');
      return;
    }

    // Prepare CSV content
    let csvContent = `ALL games & Range of Movements (${latestDateFormatted}),`; // First column header
    latestDateScores.forEach((score, index) => {
      const scoreDate = new Date(score.timestamp);
      const scoreTimeFormatted = `${scoreDate.getHours()}:${scoreDate.getMinutes()}:${scoreDate.getSeconds()}`;
      csvContent += `game ${index + 1} (${scoreTimeFormatted}),`; // Column header for each game
    });
    csvContent += "\n"; // End of header row

    // Append data for each range of movement
    const maxMovements = Math.max(...latestDateScores.map(score => score.rangeOfMovement.length));
    for (let i = 0; i < maxMovements; i++) {
      csvContent += `ROM ${i + 1},`; // Row header for range of movement
      latestDateScores.forEach(score => {
        const movement = score.rangeOfMovement[i] !== undefined ? score.rangeOfMovement[i] : ""; // Check if movement exists
        csvContent += `${movement},`; // Data for each game's movement
      });
      csvContent += "\n"; // End of row
    }

    // Create a Blob containing the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv' });

    // Create a link element
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = `${user.username}_range_of_movement_${latestDateFormatted}.csv`; // Set the file name

    // Append the link to the body and trigger the click event
    document.body.appendChild(a);
    a.click();

    // Remove the link from the body
    document.body.removeChild(a);
  }



  const downloadCsvBtn = document.getElementById('downloadCsvBtn');
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', downloadCsvForLastGameRangeOfMovement);
  }

  const popover = document.getElementById('popover');
  
  downloadCsvBtn.addEventListener('mouseenter', () => {
    popover.style.display = 'block';
  });

  downloadCsvBtn.addEventListener('mouseleave', () => {
    popover.style.display = 'none';
  });

  // Update and replace the existing scores array with Date objects
  scores.forEach(score => {
    // Convert timestamp string to Date object
    const timestampDate = new Date(score.timestamp);
    // Update the timestamp property with the Date object
    score.timestamp = timestampDate;
  });

  // Calculate total time spent
  const totalTimeSpent = scores.reduce((total, score) => total + score.timePerrun, 0);
  // console.log("Total Time Spent:", totalTimeSpent);


  function formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} min and ${remainingSeconds} sec`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hrs and ${remainingMinutes} min`;
    }
  }
  // Format total time spent
  const formattedTime = formatTime(totalTimeSpent);
  // console.log("Total Time Spent:", formattedTime);
  document.getElementById('totalTime').textContent = `${formattedTime}`;


  // Find the highest score
  const highestScore = scores.reduce((maxScore, currentScore) => {
    return currentScore.score > maxScore ? currentScore.score : maxScore;
  }, 0);

  document.getElementById('highScore').textContent = `${highestScore}`;
  console.log("Highest Score:", highestScore);

  // Refactor to calculate average score using a function
  function calculateAverageScore(scores) {
    const totalGamesPlayed = scores.length;
    const totalScore = scores.reduce((total, score) => total + score.score, 0);
    return totalGamesPlayed > 0 ? Math.round(totalScore / totalGamesPlayed) : 0;
  }

  // Calculate and display average score
  const averageScore = calculateAverageScore(scores);
  document.getElementById('averageScore').textContent = `${averageScore}`;

  function w_da(latestDate) {
    if (latestDate === null) { return null }
    return `${latestDate.getDate()} ${latestDate.toLocaleString('default', { month: 'long' })} ${latestDate.getFullYear()}`;

  }


  let yest = false;

  // Calculate the current streak based on the given scores.

  function calculateCurrentStreak(scores) {
    let currentDate = new Date();
    let currentStreak = 0;
    let lastPlayedDate = null;

    for (let i = scores.length - 1; i >= 0; i--) {
      let scoreDate = new Date(scores[i].timestamp);
      // console.log(`Score date: ${w_da(scoreDate)}, Current date: ${w_da(currentDate)}, Last played date: ${w_da(lastPlayedDate)}`);


      if (currentDate.getDate() === scoreDate.getDate() && lastPlayedDate === null) {
        lastPlayedDate = currentDate;
        currentStreak++;
      } else {
        if (lastPlayedDate === null) {
          let yesterday = new Date(currentDate);
          yesterday.setDate(currentDate.getDate() - 1);
          if (yesterday.getDate() !== scoreDate.getDate()) {
            return currentStreak;
          }
          lastPlayedDate = scoreDate;
          yest = true;
          currentStreak++;
        }
        if (lastPlayedDate.getDate() !== scoreDate.getDate()) {
          let nextDay = new Date(scoreDate);
          nextDay.setDate(scoreDate.getDate() + 1);
          if (lastPlayedDate.getDate() === nextDay.getDate()) {
            lastPlayedDate = scoreDate;
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    return currentStreak;
  }
  const currentStreak = calculateCurrentStreak(scores);
  const streakElement = document.getElementById('streak');
  const playWarningMessage = document.getElementById('playwarning');

  // console.log("Current Streak:", currentStreak);
  streakElement.textContent = currentStreak;

  if (!yest) {
    playWarningMessage.remove();
  } else {
    playWarningMessage.textContent = "(Play today to continue the streak!!!)";
  }

  // Display the number of awards

  let awards = user.awards || []; // Ensure awards array exists and handle undefined
  let awardsCount = awards.length || 0;
  awardNum = document.getElementById('Awards_num')
  awardNum.textContent = awardsCount;

  // Function to update the award images based on the user's awards
  function updateAwardImages() {
    const awardsPic = document.getElementById('Awards_pic');
    const awardImages = awardsPic.getElementsByTagName('img');

    // Iterate through all award images
    for (let i = 0; i < awardImages.length; i++) {
      const awardName = awardImages[i].getAttribute('title'); // Assuming title attribute contains the award name

      // Check if the user has the award and update the grayscale filter accordingly
      const hasAward = awards.includes(awardName);
      awardImages[i].style.filter = hasAward ? 'grayscale(0%) drop-shadow(0px 10px 10px #888) brightness(120%)' : 'grayscale(100%)';

    }
  }
  updateAwardImages();



  async function addAward(awardName) {

    fetch('/add-award', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ awardName }),
    }).then((response) => response.json())
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error('Error sending Award data:', error);
      });
  }



  function handleAwards() {
    // Check and add streak awards
    // const streakAwards = ["1 week streak award", "1 month streak award"];

    if (currentStreak >= 7 && !user.awards.includes("1 week streak award")) {
      awardsCount++;
      user.awards.push("1 week streak award");
      addAward("1 week streak award").then(() => {
        updateAwardImages();
        alert("HOORAYY YOU GOT AN AWARD for 1 week Streak");
      });
    }

    if (currentStreak >= 30 && !user.awards.includes("1 month streak award")) {
      awardsCount++;
      user.awards.push("1 month streak award");
      addAward("1 month streak award").then(() => {
        updateAwardImages();
        alert("HOORAYY YOU GOT AN AWARD for 1 month Streak");
      });
    }
    awardNum.textContent = awardsCount;

  }

  handleAwards();


  // Get the dropdown and button elements
  const chartTypeDropdown = document.getElementById('chartTypeDropdown');
  const timeRangeDropdown = document.getElementById('timeRangeDropdown');
  const displayChartBtn = document.getElementById('displayChartBtn');

  // Get the canvas element
  const scoreCtx1 = document.getElementById('scoreChart1').getContext('2d');
  const scoreCtx2 = document.getElementById('scoreChart2').getContext('2d');
  scoreCtx1.inUse = false;
  scoreCtx2.inUse = false;


  // Add an event listener to the "Display" button
  displayChartBtn.addEventListener('click', function () {
    const selectedChartType = chartTypeDropdown.value;
    const selectedTimeRange = timeRangeDropdown.value;

    // Update the charts based on the selected options
    updateCharts(selectedChartType, selectedTimeRange);
    window.scrollTo(0, 72)
  });


  function updateCharts(chartType, timeRange) {

    // Filter scores based on game type
    const filteredScores = user.scores.filter(score => score.gameType === chartType);

    // Update the existing scores array with Date objects
    filteredScores.forEach(score => {
      // Convert timestamp string to Date object
      const timestampDate = new Date(score.timestamp);

      // Update the timestamp property with the Date object
      score.timestamp = timestampDate;
    });
    // console.log(filteredScores)


    // Destroy existing charts
    if (scoreCtx1.inUse && scoreCtx1.inUse) {
      Chart.getChart(scoreCtx1).destroy();
      Chart.getChart(scoreCtx2).destroy();

    }

    // Set canvas in use flag to true
    scoreCtx1.inUse = true;
    scoreCtx2.inUse = true;

    if (chartContainer.style.display === 'none' || chartContainer.style.display === '') {
      chartContainer.style.display = 'block';
    }

    const latestDate = new Date(Math.max(...filteredScores.map(score => score.timestamp.getTime())));
    if (timeRange === 'day') {
      // console.log(latestDate);
      const latestDateformated = `${latestDate.getDate()} ${latestDate.toLocaleString('default', { month: 'long' })} ${latestDate.getFullYear()}`;

      // Filter scores for entries on the latest date
      const latestDateScores = filteredScores.filter(score => {
        const scoreDate = new Date(score.timestamp);
        return (
          scoreDate.getDate() === latestDate.getDate() &&
          scoreDate.getMonth() === latestDate.getMonth() &&
          scoreDate.getFullYear() === latestDate.getFullYear()
        );
      });

      // Extract timestamps, scores, and timeperrun values for the latest date
      const latestuserTimestamps = latestDateScores.map(score => score.timestamp.toLocaleTimeString());
      const latestuserScores = latestDateScores.map(score => score.score);
      const latestuserTimeperruns = latestDateScores.map(score => score.timePerrun);

      const scoreChart1 = new Chart(scoreCtx1, {
        type: 'line',
        data: {
          labels: latestuserTimestamps,
          datasets: [{
            label: `Score vs Last Playing Day (${latestDateformated})`,
            data: latestuserScores,
            backgroundColor: 'grey',
            borderColor: 'black',
            borderWidth: 2,
            fill: false,
          }],
        },
        options: {
          scales: {
            x: {
              type: 'category', // Using 'category' type for discrete values
              title: { display: true, text: latestDateformated },
            },
            y: { scaleLabel: { display: true, labelString: 'Score' } },
          },
        },
      });

      const scoreChart2 = new Chart(scoreCtx2, {
        type: 'line',
        data: {
          labels: latestuserTimestamps,
          datasets: [{
            label: `Timeperrun vs Last Playing Day (${latestDateformated})`,
            data: latestuserTimeperruns,
            backgroundColor: 'grey',
            borderColor: 'black',
            borderWidth: 2,
            fill: false,
          }],
        },
        options: {
          scales: {
            x: {
              type: 'category', // Using 'category' type for discrete values
              title: { display: true, text: latestDateformated },
            },
            y: { scaleLabel: { display: true, labelString: 'Timeperrun' } },
          },
        },
      });
    }

    else if (timeRange === 'month') {


      const lastMonthScores = filteredScores.filter(score => {
        const scoreDate = new Date(score.timestamp);
        return scoreDate.getMonth() === latestDate.getMonth() && scoreDate.getFullYear() === latestDate.getFullYear();
      });

      // Extract scores and timeperrun values from the user object
      const userScores = lastMonthScores.map(score => score.score);
      const userTimeperruns = lastMonthScores.map(score => score.timePerrun);
      const date = lastMonthScores.map(score => score.timestamp.getDate());
      console.log(date)
      console.log(userScores)


      const scoreChart3 = new Chart(scoreCtx1, {
        type: 'line',
        data: {
          labels: date.map(date => date.toString()), // Assuming timeperrun is a numeric value
          datasets: [{
            label: 'Score vs Date',
            data: userScores,
            backgroundColor: 'grey',
            borderColor: 'black',
            borderWidth: 2,
            fill: false,
          }],
        },
        options: {
          scales: {
            x: { type: 'linear', title: { display: true, text: 'Date', }, },
            y: { scaleLabel: { display: true, labelString: 'Score', }, },
          },
          // Add other chart options as needed
        },
      });
      const scoreChart4 = new Chart(scoreCtx2, {
        type: 'line',
        data: {
          labels: date.map(date => date.toString()), // Assuming timeperrun is a numeric value
          datasets: [{
            label: 'Timeperrun vs Date',
            data: userTimeperruns,
            backgroundColor: 'grey',
            borderColor: 'black',
            borderWidth: 2,
            fill: false,
          }],
        },
        options: {
          scales: {
            x: { type: 'linear', title: { display: true, text: 'Date', }, },
            y: { scaleLabel: { display: true, labelString: 'Timeperrun', }, },
          },
          // Add other chart options as needed
        },
      });
    }
    else if (timeRange === 'year') {
      const yearlyScores = filteredScores.filter(score => {
        const scoreDate = new Date(score.timestamp);
        return scoreDate.getFullYear() === latestDate.getFullYear();
      });
      console.log("yearlyscores:", yearlyScores);

      // Extract scores and timeperrun values from the user object
      const userScores = yearlyScores.map(score => score.score);
      const userTimeperruns = yearlyScores.map(score => score.timePerrun);
      const month = yearlyScores.map(score => score.timestamp.getMonth() + 1);
      console.log("scores", userScores)
      console.log("months:", month)

      // const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      const scoreChart5 = new Chart(scoreCtx1, {
        type: 'line',
        data: {
          labels: month,
          datasets: [{
            label: 'Score vs Month',
            data: userScores,
            backgroundColor: 'grey',
            borderColor: 'black',
            borderWidth: 2,
            fill: false,
          }],
        },
        options: {
          scales: {
            x: { type: 'linear', title: { display: true, text: 'Month' } },
            y: { scaleLabel: { display: true, labelString: 'Score' } },
          },
        },
      });

      const scoreChart6 = new Chart(scoreCtx2, {
        type: 'line',
        data: {
          labels: month,
          datasets: [{
            label: 'Timeperrun vs Month',
            data: userTimeperruns,
            backgroundColor: 'grey',
            borderColor: 'black',
            borderWidth: 2,
            fill: false,
          }],
        },
        options: {
          scales: {
            x: { type: 'linear', title: { display: true, text: 'Month' } },
            y: { scaleLabel: { display: true, labelString: 'Timeperrun' } },
          },
        },
      });
    }



  }
});
