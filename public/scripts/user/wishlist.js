$(document).ready(function() {
  $('.remove-from-wishlist').click(function() {
    const productId = $(this).data('id');
    $.ajax({
      url: `/wishlist/remove?id=${productId}`,
      method: 'DELETE',
      success: function(response) {
        if (response.success) {
          location.reload();
        } else {
          Swal.fire('Error', response.message, 'error');
        }
      },
      error: function() {
        Swal.fire('Error', 'An error occurred while removing the item from the wishlist', 'error');
      }
    });
  });
});
