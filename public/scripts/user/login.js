// Toggle password visibility
document.getElementById('togglePassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const email = document.getElementById('email');
    const password = document.getElementById('password');

    // Create error elements for each input
    const createErrorElement = (input) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        input.parentNode.appendChild(errorDiv);
        return errorDiv;
    };

    const errorElements = {
        email: createErrorElement(email),
        password: createErrorElement(password)
    };

    // Validation patterns
    const patterns = {
        email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    };

    // Error messages
    const errorMessages = {
        email: {
            required: 'Please enter your email address',
            pattern: 'Please enter a valid email address'
        },
        password: {
            required: 'Please enter a password',
            pattern: 'Password must be at least 8 characters long and include uppercase, lowercase, number and special character'
        }
    };

    // Real-time validation
    const validateInput = (input, pattern) => {
        const value = input.value.trim();
        const errorElement = errorElements[input.id];
        
        // Required field validation
        if (!value) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            errorElement.textContent = errorMessages[input.id].required;
            return false;
        }

        // Pattern validation
        if (pattern && !pattern.test(value)) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            errorElement.textContent = errorMessages[input.id].pattern;
            return false;
        }

        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        return true;
    };

    // Add input event listeners for real-time validation
    email.addEventListener('input', () => validateInput(email, patterns.email));
    password.addEventListener('input', () => validateInput(password, patterns.password));

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent default submission initially

        // Validate all fields
        const isEmailValid = validateInput(email, patterns.email);
        const isPasswordValid = validateInput(password, patterns.password);

        if (isEmailValid && isPasswordValid) {
            // If all validations pass, submit the form
            form.submit();
        } else {
            // Show error messages for invalid fields
            if (!isEmailValid) validateInput(email, patterns.email);
            if (!isPasswordValid) validateInput(password, patterns.password);
        }
    });
});