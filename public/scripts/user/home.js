document.addEventListener("DOMContentLoaded", () => {

  // Store the scroll position when the page is about to reload
  window.onbeforeunload = () => {
    sessionStorage.setItem("scrollPosition", window.scrollY);
  };

  const addCartButtons = document.querySelectorAll(".add-cart");

  addCartButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();

      const productId = button.getAttribute("data-id");
      const url = `/addToCart?id=${productId}`;

      try {
        const response = await fetch(url, { method: "GET" });
        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Added to Cart",
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
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || "An error occurred while adding to cart.",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            background: "#f8d7da",
            color: "#721c24",
          }).then(() => {
            // Refresh the page after error
            window.location.href = window.location.href;
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "An error occurred while adding to cart.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
          background: "#f8d7da",
          color: "#721c24",
        }).then(() => {
          // Refresh the page after error
          window.location.href = window.location.href;
        });
        console.error(error);
      }
    });
  });

  // Restore the scroll position after the page reloads
  const previousScrollPosition = sessionStorage.getItem("scrollPosition");
  if (previousScrollPosition) {
    window.scrollTo({
      top: previousScrollPosition,
      behavior: "smooth", // Smooth scroll to the saved position
    });
  }
});
