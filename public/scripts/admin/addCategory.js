function handleFormSumbit(event) {
  event.preventDefault(); // Prevent default form submission

  if (!validateForm()) {
    return;
  }

  const name = document.getElementById('name').value;
  const description = document.getElementById('description').value;

  fetch('/admin/addCategory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error);
        });
      }
      return response.json();
    })
    .then((data) => {
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Category added successfully',
      });
      document.getElementById('name').value = '';
      document.getElementById('description').value = '';
    })
    .catch((error) => {
      if (error.message === 'Category already exists..') {
        Swal.fire({
          icon: 'error',
          title: 'Oops',
          text: 'Category already exists..',
        });
        document.getElementById('name').value = '';
        document.getElementById('description').value = '';
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Oops',
          text: 'An error occurred in adding category',
        });
      }
    });
}

function validateForm() {
  clearErrorMessages();
  const name = document.getElementById('name').value.trim();
  const description = document.getElementById('description').value.trim();
  let isValid = true;

  if (name === '') {
    displayErrorMessage('name-error', 'Please enter a name');
    isValid = false;
  } else if (!/^[a-zA-Z\s]+$/.test(name)) {
    displayErrorMessage('name-error', 'Name field only contains alphabets');
    isValid = false;
  }

  if (description === '') {
    displayErrorMessage('description-error', 'Please enter a description');
    isValid = false;
  }

  return isValid;
}

function displayErrorMessage(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.innerText = message;
  errorElement.style.display = 'block';
}

function clearErrorMessages() {
  const errorElements = document.getElementsByClassName('error-message');
  Array.from(errorElements).forEach((element) => {
    element.innerText = '';
    element.style.display = 'none';
  });
}

function softDeleteCategory(categoryId) {
  Swal.fire({
    title: 'Are you sure?',
    text: 'You are about to delete this category. This action cannot be undone!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
  }).then((result) => {
    if (result.isConfirmed) {
      // Perform the deletion
      fetch(`/admin/deleteCategory/${categoryId}`, {
        method: 'POST',
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message) {
            // Show success notification
            Swal.fire({
              title: 'Deleted!',
              text: data.message,
              icon: 'success',
              timer: 2000, // Set timer for 3 seconds
              timerProgressBar: true, // Show a progress bar
              toast: true, // Make it a toast
              position: 'top-end', // Position it at the top-right
              showConfirmButton: false, // Don't show the confirm button
              background: '#28a745', // Green background for success
              color: '#fff', // White text color
            });

            // Delay the page reload to let the toast finish displaying
            setTimeout(() => {
              location.reload(); // Reload the page after 3 seconds
            }, 2000); // 3000ms = 3 seconds
          } else {
            // Show error notification
            Swal.fire({
              title: 'Error!',
              text: data.error || 'Failed to delete category.',
              icon: 'error',
              timer: 2000, // Set timer for 3 seconds
              timerProgressBar: true, // Show a progress bar
              toast: true, // Make it a toast
              position: 'top-end', // Position it at the top-right
              showConfirmButton: false, // Don't show the confirm button
              background: '#d9534f', // Red background for error
              color: '#fff', // White text color
            });

            // Delay the page reload to let the toast finish displaying
            setTimeout(() => {
              location.reload(); // Reload the page after 3 seconds
            }, 2000); // 3000ms = 3 seconds
          }
        })
        .catch((error) => {
          console.error('Error:', error);
          Swal.fire({
            title: 'Error!',
            text: 'Failed to delete category.',
            icon: 'error',
            timer: 2000, // Set timer for 3 seconds
            timerProgressBar: true, // Show a progress bar
            toast: true, // Make it a toast
            position: 'top-end', // Position it at the top-right
            showConfirmButton: false, // Don't show the confirm button
            background: '#d9534f', // Red background for error
            color: '#fff', // White text color
          });

          // Delay the page reload to let the toast finish displaying
          setTimeout(() => {
            location.reload(); // Reload the page after 3 seconds
          }, 3000); // 3000ms = 3 seconds
        });
    }
  });
}