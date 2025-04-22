// -----------------------------
// Configuration
// -----------------------------
const REDIRECT_PATH = "http://localhost/auth_system/MovieDBWebsite/home.html";
const PHP_BASE_URL = "http://localhost/auth_system/";

// -----------------------------
// UI Elements & Toggling
// -----------------------------
const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');
const googleLoginBtn = document.getElementById('googleLogin');
const googleRegisterBtn = document.getElementById('googleRegister');

registerBtn?.addEventListener('click', () => container?.classList.add('active'));
loginBtn?.addEventListener('click', () => container?.classList.remove('active'));

console.log("Login/Registration Page DOM Ready. Attaching listeners...");

// --------------------------------------------------
// SECTION 1: PHP/MySQL Username/Password Auth
// --------------------------------------------------
async function submitAuthForm(formId, phpFile) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const formData = new FormData(form);
        const data = new URLSearchParams();
        let username = null;

        for (const [key, value] of formData.entries()) {
            data.append(key, value);
            if (key === 'username') username = value;
        }

        try {
            const fetchUrl = `${PHP_BASE_URL}${phpFile}`;
            const response = await fetch(fetchUrl, {
                method: "POST",
                body: data,
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP Error: ${response.status}`, errorText);
                alert(`Server error: ${response.status}`);
                return;
            }

            let result;
            try {
                result = await response.json();
            } catch {
                const rawText = await response.text();
                console.error("Invalid JSON response:", rawText);
                alert("Invalid response from server.");
                return;
            }

            if (result.success) {
                if (username) localStorage.setItem("loggedInUser", username);
                if (result.redirect) {
                    setTimeout(() => {
                        window.location.href = REDIRECT_PATH;
                    }, 100);
                } else {
                    alert("Success but no redirect URL.");
                }
            } else {
                alert(result.message || "Operation failed.");
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("PHP Auth failed. See console.");
        }
    });
}

// --------------------------------------------------
// SECTION 2: Firebase Google Sign-In (Popup Flow)
// --------------------------------------------------
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    console.log("Attempting Google Sign-In...");

    try {
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;

        console.log("Google sign-in successful. User:", user.displayName, user.email, user.uid);

        const userRef = firebase.firestore().collection("users_firebase").doc(user.uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            await userRef.set({
                uid: user.uid,
                name: user.displayName || user.email,
                email: user.email || "",
                photoURL: user.photoURL || "",
                provider: "google",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("✅ New user added to Firestore");
        } else {
            console.log("ℹ️ Existing user found in Firestore");
        }

        localStorage.setItem("loggedInUser", user.displayName || user.email);
        window.location.href = REDIRECT_PATH;

    } catch (error) {
        console.error("🔥 Google sign-in error:", error);
        alert("Google sign-in failed: " + error.message);
    }
}

// -----------------------------
// Initialization / Attach Listeners
// -----------------------------
document.addEventListener('DOMContentLoaded', () => {
    submitAuthForm("registerForm", "register.php");
    submitAuthForm("loginForm", "login.php");

    googleLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        signInWithGoogle();
    });

    googleRegisterBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        signInWithGoogle();
    });

    console.log("Login/Registration Page Listeners Attached.");
});