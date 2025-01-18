

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
});
