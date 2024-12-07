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

document.getElementById('toggleConfirmPassword').addEventListener('click', function() {
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const icon = this.querySelector('i');
    
    if (confirmPasswordInput.type === 'password') {
        confirmPasswordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        confirmPasswordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const fullName = document.getElementById('fullName');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');

    // Create error elements for each input
    const createErrorElement = (input) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        input.parentNode.appendChild(errorDiv);
        return errorDiv;
    };

    const errorElements = {
        fullName: createErrorElement(fullName),
        email: createErrorElement(email),
        phone: createErrorElement(phone),
        password: createErrorElement(password),
        confirmPassword: createErrorElement(confirmPassword)
    };

    // Validation patterns
    const patterns = {
        fullName: /^[a-zA-Z\s]{3,30}$/,
        email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        phone: /^[0-9]{10}$/,
        password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    };

    // Error messages
    const errorMessages = {
        fullName: {
            required: 'Please enter your full name',
            pattern: 'Name should be 3-30 characters long and contain only letters'
        },
        email: {
            required: 'Please enter your email address',
            pattern: 'Please enter a valid email address'
        },
        phone: {
            required: 'Please enter your phone number',
            pattern: 'Please enter a valid 10-digit phone number'
        },
        password: {
            required: 'Please enter a password',
            pattern: 'Password must be at least 8 characters long and include uppercase, lowercase, number and special character'
        },
        confirmPassword: {
            required: 'Please confirm your password',
            match: 'Passwords do not match'
        }
    };

    // Password validation checks
    const validatePassword = (password) => {
        const requirements = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[@$!%*?&]/.test(password)
        };

        // Update requirement icons
        Object.keys(requirements).forEach(req => {
            const element = document.getElementById(req + 'Req');
            const icon = element.querySelector('i');
            
            if (requirements[req]) {
                icon.className = 'fas fa-check text-success';
                element.classList.remove('text-danger');
                element.classList.add('text-success');
            } else {
                icon.className = 'fas fa-times text-danger';
                element.classList.remove('text-success');
                element.classList.add('text-danger');
            }
        });

        return Object.values(requirements).every(Boolean);
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

        // Special handling for password
        if (input.id === 'password') {
            const isValid = validatePassword(value);
            input.classList.toggle('is-invalid', !isValid);
            input.classList.toggle('is-valid', isValid);
            return isValid;
        }

        // Pattern validation (except for confirmPassword)
        if (pattern && !pattern.test(value)) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            errorElement.textContent = errorMessages[input.id].pattern;
            return false;
        }

        // Confirm password validation
        if (input.id === 'confirmPassword' && value !== password.value) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            errorElement.textContent = errorMessages.confirmPassword.match;
            return false;
        }

        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        return true;
    };

    // Add input event listeners for real-time validation
    fullName.addEventListener('input', () => validateInput(fullName, patterns.fullName));
    email.addEventListener('input', () => validateInput(email, patterns.email));
    phone.addEventListener('input', () => validateInput(phone, patterns.phone));
    password.addEventListener('input', () => validateInput(password, patterns.password));
    confirmPassword.addEventListener('input', () => validateInput(confirmPassword));

    // Show/hide password requirements
    const passwordRequirements = document.getElementById('passwordRequirements');
    password.addEventListener('focus', () => {
        passwordRequirements.classList.add('show');
    });

    password.addEventListener('blur', () => {
        if (!password.value) {
            passwordRequirements.classList.remove('show');
        }
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent default submission initially

        // Validate all fields
        const isFullNameValid = validateInput(fullName, patterns.fullName);
        const isEmailValid = validateInput(email, patterns.email);
        const isPhoneValid = validateInput(phone, patterns.phone);
        const isPasswordValid = validateInput(password, patterns.password);
        const isConfirmPasswordValid = validateInput(confirmPassword);

        if (isFullNameValid && isEmailValid && isPhoneValid && isPasswordValid && isConfirmPasswordValid) {
            // If all validations pass, submit the form
            form.submit();
        } else {
            // Show error messages for invalid fields
            if (!isFullNameValid) validateInput(fullName, patterns.fullName);
            if (!isEmailValid) validateInput(email, patterns.email);
            if (!isPhoneValid) validateInput(phone, patterns.phone);
            if (!isPasswordValid) validateInput(password, patterns.password);
            if (!isConfirmPasswordValid) validateInput(confirmPassword);
        }
    });
});