// Show preloader immediately
window.addEventListener('beforeunload', function() {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        preloader.style.display = 'flex';
        preloader.style.opacity = '1';
    }
});

// Hide preloader after everything is loaded
window.addEventListener('load', function() {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }, 300); // Small delay to ensure smooth transition
    }
});
