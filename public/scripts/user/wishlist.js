$(document).ready(function() {
  if (typeof Swal === 'undefined') {
    console.error('SweetAlert library is not loaded.');
    return;
  }

  $('.remove-from-wishlist').click(async function() {
    const productId = $(this).data('id');
    if (!productId) {
      Swal.fire("Error", "Invalid product ID", "error");
      return;
    }
    const url = `/wishlist/remove?id=${productId}`;

    try {
      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Item deleted",
          text: data.message,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
          background: "#d4edda",
          color: "#155724",
        }).then(() => {
          // Refresh the page after success
          window.location.href = window.location.href;
        });
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'An error occurred while removing the item from the wishlist', 'error');
      console.error(error);
    }
  });

  // Update delete button handler
  $('.delete-btn').click(function(e) {
    e.preventDefault();
    const productId = $(this).data('id');
    
    Swal.fire({
      title: 'Remove from Wishlist?',
      text: "Are you sure you want to remove this item?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: `/wishlist/remove?id=${productId}`,
          method: 'DELETE',
          success: function(response) {
            if(response.success) {
              Swal.fire({
                icon: 'success',
                title: 'Removed!',
                text: 'Item has been removed from your wishlist.',
                showConfirmButton: false,
                timer: 1500
              }).then(() => {
                location.reload();
              });
            }
          },
          error: function() {
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: 'Something went wrong!'
            });
          }
        });
      }
    });
  });
});
