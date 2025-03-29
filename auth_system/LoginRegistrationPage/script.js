const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});

// Function to handle form submission via AJAX
async function submitForm(formId, phpFile, redirectPage = null) {
    const form = document.getElementById(formId);
    
    form.addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent default form submission

        const formData = new FormData(form);
        const data = new URLSearchParams();

        // Convert formData to URLSearchParams
        for (const [key, value] of formData.entries()) {
            data.append(key, value);
        }

        try {
            let response = await fetch(`http://localhost/auth_system/${phpFile}`, { 
                method: "POST",
                body: data,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            let result = await response.json();

            if (result.success) {
                // Redirect to the provided page or default to the main page
                window.location.href = `http://localhost${result.redirect}`;
            } else {
                // Show error only if login fails
                alert(result.message || "Invalid credentials. Please try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Something went wrong! Please try again.");
        }
    });
}

// Attach event listeners to forms
submitForm("registerForm", "register.php");
submitForm("loginForm", "login.php", "MovieDBWebsite/home.html"); // Redirect login to the main page
