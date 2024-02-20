
function deleteAccount() {
  if (confirm("Are you sure you want to delete your account?")) {
    fetch('/delete-account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        console.log(data.success)
        if (data.success) {
          window.location.href = '/login';
        } else {
          alert('Failed to delete account. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error deleting account:', error);
      });
  }
}


const eventsfloating = document.getElementById('eventsfloating');
// if (eventsfloating) {
//   eventsfloating.addEventListener('click', downloadCsvForLastGameRangeOfMovement);
// }

const popover = document.getElementById('popover');

eventsfloating.addEventListener('mouseenter', () => {
  popover.style.display = 'block';
});

eventsfloating.addEventListener('mouseleave', () => {
  popover.style.display = 'none';
});
