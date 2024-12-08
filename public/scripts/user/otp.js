document.addEventListener('DOMContentLoaded', function() {
    const otpInput = document.querySelector('.otp-input');
    const form = document.getElementById('otpForm');
    const resendButton = document.getElementById('resendOTP');
    const timerSpan = document.getElementById('timer');
    let timeLeft = 60;
    let timerInterval;

    resendButton.style.display = 'none';
    otpInput.focus();

    // Handle OTP input - restrict to numbers and 6 digits
    otpInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
    });

    // Timer functionality
    function startTimer() {
        timeLeft = 60;
        resendButton.style.display = 'none';
        timerSpan.parentElement.parentElement.style.display = 'block';
        
        clearInterval(timerInterval);
        updateTimer();
        timerInterval = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                resendButton.style.display = 'inline';
                timerSpan.parentElement.parentElement.style.display = 'none';
                return;
            }
            timeLeft--;
            updateTimer();
        }, 1000);
    }

    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerSpan.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Start the initial timer
    startTimer();

    // Handle resend OTP click
    resendButton.addEventListener('click', function(e) {
        e.preventDefault();
        // Here you can add your API call to resend OTP
        startTimer();
        otpInput.value = ''; // Clear the OTP input
        otpInput.focus();
    });
});

function validateOtp(){
    const otp = document.getElementById("otp").value;

    if (!otp) {
        Swal.fire({
            icon: "error",
            title: "Invalid OTP",
            text: "Please enter a valid OTP.",
            showConfirmButton: true
        });
        return false;
    }

    $.ajax({
        type:"POST",
        url:"verify-otp",
        data:{otp:otp},
        success: function(response){
            if(response.success){
                Swal.fire({
                    icon:"success",
                    title:"OTP Verified Successfully",
                    showConfirmButton: false,
                    timer:1500,
                }).then(()=>{
                    window.location.href = response.redirectUrl;
                })
            }else{
                Swal.fire({
                    icon:"error",
                    title:"Error",
                    text: response.message,
                    showConfirmButton: false,
                    timer:1500,
                })
            }
        },
        error: function(){
            Swal.fire({
                icon:"error",
                title:"invalid OTP",
                text: "Please try again",
                showConfirmButton: false,
                timer:1500,
            })
        }
    })
    return false;
}

function resendOtp(){
    $.ajax({
        type: "POST",
        url: "resend-otp",
        success: function(response){
            if(response.success){
                Swal.fire({
                    icon:"success",
                    title:"Otp resended successfully",
                    showConfirmButton: false,
                    timer:1500
                })
            }else{
                Swal.fire({
                    icon:"error",
                    title:"error",
                    text:"An error occured while resending otp! please try again"
                })
            }
        }
    })
    return false;  
}