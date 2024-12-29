function softDeleteProduct(productId) {
  console.log('Product ID to delete:', productId); // Debug log

  if (!productId) {
    Swal.fire('Error', 'Invalid Product ID.', 'error');
    return;
  }

  Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'No, cancel!',
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`/admin/deleteProduct/${productId}`, {
        method: 'POST',
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message) {
            // Show success notification as a toast
            Swal.fire({
              title: 'Deleted!',
              text: data.message,
              icon: 'success',
              timer: 3000, // Display for 3 seconds
              timerProgressBar: true, // Show progress bar
              toast: true, // Make it a toast
              position: 'top-end', // Top-right corner
              showConfirmButton: false, // Hide confirm button
              background: '#28a745', // Success green background
              color: '#fff', // White text color
            });

            // Delay the reload to allow the toast to fully display
            setTimeout(() => {
              location.reload(); // Reload the page after 3 seconds
            }, 3000);
          } else {
            // Show error notification as a toast
            Swal.fire({
              title: 'Error!',
              text: data.error || 'Failed to delete the product.',
              icon: 'error',
              timer: 3000, // Display for 3 seconds
              timerProgressBar: true, // Show progress bar
              toast: true, // Make it a toast
              position: 'top-end', // Top-right corner
              showConfirmButton: false, // Hide confirm button
              background: '#d9534f', // Error red background
              color: '#fff', // White text color
            });
          }
        })
        .catch((error) => {
          console.error('Error:', error);
          Swal.fire({
            title: 'Error!',
            text: 'An error occurred. Please try again later.',
            icon: 'error',
            timer: 3000, // Display for 3 seconds
            timerProgressBar: true, // Show progress bar
            toast: true, // Make it a toast
            position: 'top-end', // Top-right corner
            showConfirmButton: false, // Hide confirm button
            background: '#d9534f', // Error red background
            color: '#fff', // White text color
          });
        });
    } else {
      Swal.fire({
        title: 'Cancelled',
        text: 'Your product is safe!',
        icon: 'info',
        timer: 3000, // Display for 3 seconds
        timerProgressBar: true, // Show progress bar
        toast: true, // Make it a toast
        position: 'top-end', // Top-right corner
        showConfirmButton: false, // Hide confirm button
        background: '#6c757d', // Neutral gray background
        color: '#fff', // White text color
      });
    }
  });
}