// File: MovieDBWebsite/script.js

// API Configuration
const apiKey = "401166b8f29da0cebc699ebd8e32c684";
const baseUrl = "https://api.themoviedb.org/3";
const imageBaseUrl = "https://image.tmdb.org/t/p/";
const backendBaseUrl = "http://localhost/auth_system"; // Base URL for your PHP scripts

// Cache for storing API responses
const cache = {
    data: {},
    get: function(key) { return this.data[key] || null; },
    set: function(key, value) { this.data[key] = value; }
};

// --- My List - Populated from backend for logged-in users ---
let myList = [];
let loggedInUsername = localStorage.getItem("loggedInUser"); // Keep track of username

// ================ AUTH & LIST SYNCING ================

// Function to fetch the user's list from the backend
async function fetchUserList(username) {
    if (!username) return []; // No user logged in

    console.log(`Fetching list for user: ${username}`); // Debug log
    try {
        const response = await fetch(`${backendBaseUrl}/get_my_list.php?username=${encodeURIComponent(username)}`);

        if (!response.ok) {
            console.error(`Failed to fetch user list: ${response.status} ${response.statusText}`);
             try { const errorBody = await response.text(); console.error("Response body:", errorBody); } catch(e) {}
            showToast(`Error fetching your list (${response.status}).`);
            return [];
        }

        const result = await response.json();

        if (result.success && Array.isArray(result.list)) {
            console.log("Fetched list:", result.list); // Debug log
            // Ensure IDs are numbers if needed elsewhere, though JS comparison often handles strings/numbers
            // return result.list.map(item => ({ ...item, id: Number(item.id) }));
            return result.list;
        } else {
            console.error("API error fetching user list:", result.message || 'Unknown error');
            showToast(result.message || "Could not load your list.");
            return [];
        }
    } catch (error) {
        console.error("Network error fetching user list:", error);
        showToast("Network error while fetching your list.");
        return [];
    }
}

// Modified checkAuth to fetch list on load
async function checkAuth() {
    loggedInUsername = localStorage.getItem("loggedInUser"); // Update global username state
    const authLink = document.getElementById("authLink");
    const userInfo = document.getElementById("user-info");

    if (!authLink || !userInfo) {
        console.error("Auth UI elements (authLink/user-info) not found.");
        return; // Stop if essential elements are missing
    }

    if (loggedInUsername) {
        userInfo.innerHTML = `👤 ${loggedInUsername}`;
        authLink.textContent = "Logout";
        authLink.href = "#";
        authLink.onclick = (e) => {
            e.preventDefault();
            console.log("Logging out...");
            localStorage.removeItem("loggedInUser");
            myList = [];
            loggedInUsername = null;
            window.location.href = "/auth_system/LoginRegistrationPage/index.html"; // Redirect to login
        };

        // --- FETCH USER LIST ON AUTH CHECK ---
        console.log("User logged in, fetching list...");
        myList = await fetchUserList(loggedInUsername); // Populate the global myList array
        updateListButtons(); // Update buttons based on the fetched list

        // If on My List page, trigger display update after fetching
        // Note: displayMyList might be called again in DOMContentLoaded listener, which is fine.
        if (window.location.pathname.includes('my-list.html')) {
             console.log("checkAuth: Path is my-list.html, calling displayMyList.");
             displayMyList(); // Call displayMyList AFTER list is fetched
        }

    } else {
        console.log("User not logged in.");
        userInfo.innerHTML = '';
        authLink.textContent = "Login/Register";
        authLink.href = "/auth_system/LoginRegistrationPage/index.html";
        authLink.onclick = null; // Remove logout handler
        myList = []; // Clear list
        updateListButtons(); // Update buttons to show "Add"

         // If on My List page, trigger display update to show login prompt
        if (window.location.pathname.includes('my-list.html')) {
             console.log("checkAuth: Path is my-list.html (logged out), calling displayMyList.");
             displayMyList();
        }
    }
}

// Check if item is in My List (checks the JS variable populated from DB)
function isInMyList(itemId, itemType) {
    if (!itemId || !itemType) return false;
    // Ensure consistent comparison (e.g., comparing numbers to numbers)
    const idToCheck = Number(itemId);
    return myList.some(item => Number(item.id) === idToCheck && item.type === itemType);
}

// Toggle item in My List (interacts with backend - NOW CHECKS LOCALSTORAGE DIRECTLY)
async function toggleMyList(itemId, itemType) {
    // --- CRITICAL CHANGE: Check localStorage directly at the moment of the click ---
    const currentLoggedInUser = localStorage.getItem("loggedInUser");
    console.log(`toggleMyList called. User from localStorage: ${currentLoggedInUser}. (Global var was: ${loggedInUsername})`); // Compare values

    if (!currentLoggedInUser) { // Use the direct value for the auth check
        showToast("Please log in to manage your list.");
        console.error("toggleMyList blocked: User not found in localStorage at time of click.");
        return;
    }
    // --- END CRITICAL CHANGE ---

    // Now proceed using currentLoggedInUser for the backend request

    if (!itemId || !itemType) {
        console.error("toggleMyList called with invalid ID or Type:", itemId, itemType);
        showToast("Cannot modify list: Invalid item data.");
        return;
    }

    // Use the global myList array (populated by checkAuth) to determine current state
    const itemExists = isInMyList(itemId, itemType);
    const endpoint = itemExists ? 'remove_from_list.php' : 'add_to_list.php';
    const fullUrl = `${backendBaseUrl}/${endpoint}`;

    const formData = new FormData();
    // --- Use the directly fetched username for the backend ---
    formData.append('username', currentLoggedInUser);
    formData.append('item_id', itemId);
    formData.append('item_type', itemType);

    let itemTitle = '';
    let itemPosterPath = null;

    console.log(`Toggling item: ID=${itemId}, Type=${itemType}, Exists=${itemExists}, Endpoint=${endpoint}, User=${currentLoggedInUser}`);

    // If adding, fetch details from TMDB to send to backend
    if (!itemExists) {
        try {
            console.log(`Fetching TMDB details for ID=${itemId}, Type=${itemType} to add`);
            const tmdbResponse = await fetch(`${baseUrl}/${itemType}/${itemId}?api_key=${apiKey}`);
            if (!tmdbResponse.ok) throw new Error(`TMDB fetch failed: ${tmdbResponse.status}`);
            const tmdbData = await tmdbResponse.json();

            itemTitle = tmdbData.title || tmdbData.name;
            itemPosterPath = tmdbData.poster_path; // Can be null

            if (!itemTitle) throw new Error("Could not retrieve item title from TMDB.");

            formData.append('title', itemTitle);
            if (itemPosterPath) formData.append('poster_path', itemPosterPath);

            console.log(`Fetched details for add: Title=${itemTitle}, Poster=${itemPosterPath}`);

        } catch (error) {
            console.error("Error fetching TMDB details for add:", error);
            showToast("Error fetching item details to add.");
            return;
        }
    } else {
         // Get title from existing global myList for removal message
         const existingItem = myList.find(i => Number(i.id) === Number(itemId) && i.type === itemType);
         itemTitle = existingItem ? existingItem.title : 'Item';
    }

    // Call the backend PHP script
    try {
        console.log(`Calling backend: ${fullUrl}`);
        const response = await fetch(fullUrl, {
            method: 'POST',
            body: new URLSearchParams(formData)
        });

        if (!response.ok) {
             console.error(`Backend error: ${response.status} ${response.statusText}`);
             try { const errorBody = await response.text(); console.error("Response body:", errorBody); } catch(e) {}
             showToast(`Server error (${response.status}) modifying list.`);
             return;
        }

        const result = await response.json();
        console.log("Backend response:", result);

        if (result.success) {
            // Update global myList array immediately for responsive UI
            if (itemExists) { // Successfully removed
                myList = myList.filter(item => !(Number(item.id) === Number(itemId) && item.type === itemType));
                showToast(`${itemTitle} removed from My List`);
            } else { // Successfully added
                 myList.push({
                     id: Number(itemId),
                     type: itemType,
                     title: itemTitle,
                     poster_path: itemPosterPath,
                     // 'date' field comes from backend when fetching the list
                 });
                showToast(`${itemTitle} added to My List`);
            }
            console.log("Updated global myList:", myList);
            updateListButtons(); // Refresh button states across the page

            // Refresh display if on My List page
            if (window.location.pathname.includes('my-list.html')) {
                displayMyList();
            }
        } else {
            showToast(result.message || `Failed to ${itemExists ? 'remove' : 'add'} item.`);
        }
    } catch (error) {
        console.error("Network error toggling list item:", error);
        showToast("Network error. Please try again.");
    }
}

// Show toast notification (No changes needed from original)
function showToast(message) {
    // ... (keep existing toast function)
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
             if (toast.parentNode) {
                 toast.parentNode.removeChild(toast);
             }
        }, 300);
    }, 3000);
}


// Update My List buttons across the site (Refined)
function updateListButtons() {
    // ... (keep existing refined updateListButtons function)
    document.querySelectorAll('.btn-list').forEach(btn => {
        const id = btn.getAttribute('data-id');
        const type = btn.getAttribute('data-type');

        if (!id || !type) {
            return;
        }

        const icon = btn.querySelector('i');
        let textElement = btn.querySelector('span.button-text');
        if (!textElement) {
            let potentialTextNode = icon ? icon.nextSibling : btn.firstChild;
             if (potentialTextNode && potentialTextNode.nodeType === Node.TEXT_NODE) {
                 textElement = document.createElement('span');
                 textElement.className = 'button-text';
                 textElement.textContent = potentialTextNode.textContent.trim();
                 potentialTextNode.parentNode.replaceChild(textElement, potentialTextNode);
             } else {
                 textElement = document.createElement('span');
                 textElement.className = 'button-text';
                 if (icon) btn.appendChild(document.createTextNode(' '));
                 btn.appendChild(textElement);
             }
        }

        if (isInMyList(id, type)) {
            if (icon) {
                icon.classList.remove('fa-plus');
                icon.classList.add('fa-check');
            }
            textElement.textContent = 'In List';
            btn.classList.add('in-list');
        } else {
            if (icon) {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-plus');
            }
            textElement.textContent = 'Add to List';
            btn.classList.remove('in-list');
        }
    });
}


// ================ HERO SLIDER FUNCTIONS ================
// ... (keep existing hero slider functions: currentHeroSlide, fetchHeroSlider, displayHeroSlider, slideHero, goToHeroSlide) ...
let currentHeroSlide = 0;

function fetchHeroSlider() {
    const cacheKey = 'heroSlider';
    const cachedData = cache.get(cacheKey);

    if (cachedData) { displayHeroSlider(cachedData); return; }

    fetch(`${baseUrl}/trending/all/week?api_key=${apiKey}`)
        .then(response => response.ok ? response.json() : Promise.reject(`Hero fetch failed: ${response.status}`))
        .then(data => {
            cache.set(cacheKey, data.results);
            displayHeroSlider(data.results);
        })
        .catch(error => {
            console.error('Error fetching hero slider:', error);
            const slider = document.getElementById('heroSlider');
            if(slider) slider.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i><p>Failed to load featured content.</p></div>`;
        });
}

function displayHeroSlider(items) {
    const slider = document.getElementById('heroSlider');
    const indicators = document.getElementById('heroIndicators');

    if (!slider || !indicators) return;

    if (!items || items.length === 0) {
        slider.innerHTML = `<div class="error-message"><i class="fas fa-info-circle"></i><p>No featured content available.</p></div>`;
        indicators.innerHTML = '';
        return;
    }

    const displayItems = items.slice(0, 5);

    slider.innerHTML = displayItems.map((item, index) => {
        const itemId = item.id;
        const itemType = item.media_type;
        if (!itemId || !itemType || (itemType !== 'movie' && itemType !== 'tv')) return '';

        const title = item.title || item.name;
        const overview = item.overview ? item.overview.substring(0, 150) + '...' : 'No description available.';
        const backdropPath = item.backdrop_path ? `${imageBaseUrl}original${item.backdrop_path}` : '';
        const isListed = isInMyList(itemId, itemType);

        return `
        <div class="hero-slide ${index === 0 ? 'active' : ''}" style="background-image: ${backdropPath ? `url('${backdropPath}')` : 'none; background-color: #222;'}">
            <div class="hero-content">
                <h1>${title || 'Untitled'}</h1>
                <p>${overview}</p>
                <div class="hero-buttons">
                    <button class="btn-play" onclick="window.location.href='details.html?id=${itemId}&type=${itemType}'">
                        <i class="fas fa-play"></i> Play Trailer
                    </button>
                    <button class="btn-list ${isListed ? 'in-list' : ''}" data-id="${itemId}" data-type="${itemType}" onclick="event.stopPropagation(); toggleMyList(${itemId}, '${itemType}')">
                        <i class="fas ${isListed ? 'fa-check' : 'fa-plus'}"></i>
                        <span class="button-text">${isListed ? 'In List' : 'Add to List'}</span>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');

    indicators.innerHTML = displayItems.map((_, index) => `
        <button class="hero-indicator ${index === 0 ? 'active' : ''}" onclick="goToHeroSlide(${index})"></button>
    `).join('');

    updateListButtons();
}


function slideHero(direction) {
    const slides = document.querySelectorAll('#heroSlider .hero-slide');
    const indicators = document.querySelectorAll('#heroIndicators .hero-indicator');
    if (slides.length === 0) return;

    slides[currentHeroSlide]?.classList.remove('active');
    indicators[currentHeroSlide]?.classList.remove('active');

    currentHeroSlide = (currentHeroSlide + direction + slides.length) % slides.length;

    slides[currentHeroSlide]?.classList.add('active');
    indicators[currentHeroSlide]?.classList.add('active');
}

function goToHeroSlide(index) {
    const slides = document.querySelectorAll('#heroSlider .hero-slide');
    const indicators = document.querySelectorAll('#heroIndicators .hero-indicator');
    if (slides.length === 0 || index < 0 || index >= slides.length) return;

    slides[currentHeroSlide]?.classList.remove('active');
    indicators[currentHeroSlide]?.classList.remove('active');

    currentHeroSlide = index;

    slides[currentHeroSlide]?.classList.add('active');
    indicators[currentHeroSlide]?.classList.add('active');
}


// ================ VIEW ALL FUNCTIONS ================
// ... (keep existing view all functions: loadViewAll, displayViewAllGrid) ...
// Make sure displayViewAllGrid adds data-id and data-type to buttons
function loadViewAll() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const category = urlParams.get('category');

    if (!type || !category || (type !== 'movie' && type !== 'tv')) {
        console.warn("View All page loaded with invalid type or category.");
        window.location.href = 'home.html';
        return;
    }

    const title = category.replace(/([A-Z])/g, ' $1').trim();
    document.title = `MovieDB - ${title}`;

    const header = document.querySelector('.view-all-header h1') || document.querySelector('#viewAllTitle');
    if (header) header.textContent = title;

    const endpoints = {
        trending: `${baseUrl}/trending/${type}/week?api_key=${apiKey}`,
        popularMovies: `${baseUrl}/movie/popular?api_key=${apiKey}`,
        hindiMovies: `${baseUrl}/discover/movie?with_original_language=hi&sort_by=popularity.desc&api_key=${apiKey}`,
        topRated: `${baseUrl}/${type}/top_rated?api_key=${apiKey}`,
        hindiTV: `${baseUrl}/discover/tv?with_original_language=hi&sort_by=popularity.desc&api_key=${apiKey}`,
        nowPlaying: `${baseUrl}/movie/now_playing?api_key=${apiKey}`,
        upcoming: `${baseUrl}/movie/upcoming?api_key=${apiKey}`,
        popularTV: `${baseUrl}/tv/popular?api_key=${apiKey}`,
        topRatedTV: `${baseUrl}/tv/top_rated?api_key=${apiKey}`,
        onAir: `${baseUrl}/tv/on_the_air?api_key=${apiKey}`,
        trendingTV: `${baseUrl}/trending/tv/week?api_key=${apiKey}`
    };

    const endpointUrl = endpoints[category];

    if (endpointUrl) {
        console.log(`Fetching View All data for: ${category} (${type}) from ${endpointUrl}`);
        fetch(endpointUrl)
            .then(response => response.ok ? response.json() : Promise.reject(`View All fetch failed: ${response.status}`))
            .then(data => {
                 if (document.getElementById('viewAllSlider')) {
                     displayViewAllSlider(data.results, type); // Assumes this function is defined in view-all.html
                 } else if (document.getElementById('viewAllGrid')) {
                     displayViewAllGrid(data.results, type);
                 } else {
                      console.error("Could not find container (#viewAllSlider or #viewAllGrid) in view-all.html");
                 }
            })
            .catch(error => console.error('Error loading View All content:', error));
    } else {
         console.error(`No endpoint defined for category: ${category}`);
    }
}

function displayViewAllGrid(items, type) {
    const grid = document.getElementById('viewAllGrid');
    if (!grid) return;

    grid.innerHTML = items.map(item => {
        const itemId = item.id;
        if (!itemId) return '';

        const title = item.title || item.name;
        const year = item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : '';
        const isListed = isInMyList(itemId, type);

        return `
        <div class="view-all-item">
            <img src="${item.poster_path ? `${imageBaseUrl}w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Poster'}"
                 alt="${title}"
                 onclick="window.location.href='details.html?id=${itemId}&type=${type}'">
            <div class="view-all-item-overlay">
                <h3>${title || 'Untitled'}</h3>
                <p>${year || 'N/A'}</p>
                <div class="view-all-item-buttons">
                    <button class="btn-more-info" onclick="event.stopPropagation(); window.location.href='details.html?id=${itemId}&type=${type}'">
                        <i class="fas fa-info-circle"></i> More Info
                    </button>
                    <button class="btn-list ${isListed ? 'in-list' : ''}" data-id="${itemId}" data-type="${type}" onclick="event.stopPropagation(); toggleMyList(${itemId}, '${type}')">
                        <i class="fas ${isListed ? 'fa-check' : 'fa-plus'}"></i>
                        <span class="button-text">${isListed ? 'In List' : 'Add to List'}</span>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
    updateListButtons();
}

// ================ HOME PAGE FUNCTIONS ================
// ... (keep existing home page functions: initHomePage, fetchTrending, fetchPopularMovies, fetchHindiMovies, fetchTopRated, fetchHindiTV) ...
function initHomePage() {
    const sections = ['trending', 'popularMovies', 'hindiMovies', 'topRated', 'hindiTV'];
    sections.forEach(sectionId => {
        const el = document.getElementById(sectionId);
        if (el) el.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    });

    fetchTrending();
    fetchPopularMovies();
    fetchHindiMovies();
    fetchTopRated('movie');
    fetchHindiTV();
    fetchHeroSlider();
}

function fetchTrending() {
    const cacheKey = 'trending';
    const cachedData = cache.get(cacheKey);
    if (cachedData) { displaySlider('trending', cachedData, 'multi'); return; }

    fetch(`${baseUrl}/trending/all/week?api_key=${apiKey}`)
        .then(response => response.ok ? response.json() : Promise.reject('Trending fetch failed'))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('trending', data.results, 'multi');
        }).catch(err => console.error("fetchTrending error:", err));
}

function fetchPopularMovies() {
    const cacheKey = 'popularMovies';
    const cachedData = cache.get(cacheKey);
    if (cachedData) { displaySlider('popularMovies', cachedData, 'movie'); return; }

    fetch(`${baseUrl}/movie/popular?api_key=${apiKey}&language=en-US&page=1`)
        .then(response => response.ok ? response.json() : Promise.reject('Popular Movies fetch failed'))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('popularMovies', data.results, 'movie');
        }).catch(err => console.error("fetchPopularMovies error:", err));
}

function fetchHindiMovies() {
    const cacheKey = 'hindiMovies';
    const cachedData = cache.get(cacheKey);
     if (cachedData) { displaySlider('hindiMovies', cachedData, 'movie'); return; }

    fetch(`${baseUrl}/discover/movie?api_key=${apiKey}&language=en-US®ion=IN&with_original_language=hi&sort_by=popularity.desc&page=1`)
        .then(response => response.ok ? response.json() : Promise.reject('Hindi Movies fetch failed'))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('hindiMovies', data.results, 'movie');
        }).catch(err => console.error("fetchHindiMovies error:", err));
}

function fetchTopRated(type = 'movie') {
    const cacheKey = `topRated_${type}`;
    const elementId = type === 'movie' ? 'topRated' : 'topRatedTV';
    const cachedData = cache.get(cacheKey);
    if (cachedData) { displaySlider(elementId, cachedData, type); return; }

    fetch(`${baseUrl}/${type}/top_rated?api_key=${apiKey}&language=en-US&page=1`)
        .then(response => response.ok ? response.json() : Promise.reject(`Top Rated ${type} fetch failed`))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider(elementId, data.results, type);
        }).catch(err => console.error(`fetchTopRated (${type}) error:`, err));
}


function fetchHindiTV() {
    const cacheKey = 'hindiTV';
    const cachedData = cache.get(cacheKey);
    if (cachedData) { displaySlider('hindiTV', cachedData, 'tv'); return; }

    fetch(`${baseUrl}/discover/tv?api_key=${apiKey}&language=en-US®ion=IN&with_original_language=hi&sort_by=popularity.desc&page=1`)
        .then(response => response.ok ? response.json() : Promise.reject('Hindi TV fetch failed'))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('hindiTV', data.results, 'tv');
        }).catch(err => console.error("fetchHindiTV error:", err));
}


// ================ MOVIES PAGE FUNCTIONS ================
// ... (keep existing movies page functions: initMoviesPage, fetchNowPlaying, fetchPopularMoviesPage, etc.) ...
function initMoviesPage() {
    const sections = ['nowPlaying', 'popularMovies', 'hindiMovies', 'topRated', 'upcoming'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    });
    fetchNowPlaying();
    fetchPopularMoviesPage();
    fetchHindiMoviesPage();
    fetchTopRatedMovies();
    fetchUpcoming();
}

function fetchNowPlaying() {
    const cacheKey = 'nowPlaying';
    const cachedData = cache.get(cacheKey);
    if (cachedData) { displaySlider('nowPlaying', cachedData, 'movie'); return; }

    fetch(`${baseUrl}/movie/now_playing?api_key=${apiKey}&language=en-US&page=1`)
       .then(response => response.ok ? response.json() : Promise.reject('Now Playing fetch failed'))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('nowPlaying', data.results, 'movie');
        }).catch(err => console.error("fetchNowPlaying error:", err));
}

function fetchPopularMoviesPage() {
    fetchPopularMovies();
}
function fetchHindiMoviesPage() {
    fetchHindiMovies();
}
function fetchTopRatedMovies() {
    fetchTopRated('movie');
}

function fetchUpcoming() {
    const cacheKey = 'upcoming';
    const cachedData = cache.get(cacheKey);
    if (cachedData) { displaySlider('upcoming', cachedData, 'movie'); return; }

    fetch(`${baseUrl}/movie/upcoming?api_key=${apiKey}&language=en-US&page=1`)
        .then(response => response.ok ? response.json() : Promise.reject('Upcoming fetch failed'))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('upcoming', data.results, 'movie');
        }).catch(err => console.error("fetchUpcoming error:", err));
}


// ================ TV SHOWS PAGE FUNCTIONS ================
// ... (keep existing TV shows page functions: initTVPage, fetchPopularTV, etc.) ...
function initTVPage() {
    const sections = ['popularTV', 'hindiTV', 'topRatedTV', 'onAir', 'trendingTV'];
     sections.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    });
    fetchPopularTV();
    fetchHindiTVPage();
    fetchTopRatedTV();
    fetchOnAir();
    fetchTrendingTV();
}

function fetchPopularTV() {
     const cacheKey = 'popularTV';
     const cachedData = cache.get(cacheKey);
     if (cachedData) { displaySlider('popularTV', cachedData, 'tv'); return; }

     fetch(`${baseUrl}/tv/popular?api_key=${apiKey}&language=en-US&page=1`)
        .then(response => response.ok ? response.json() : Promise.reject('Popular TV fetch failed'))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('popularTV', data.results, 'tv');
        }).catch(err => console.error("fetchPopularTV error:", err));
}

function fetchHindiTVPage() {
    fetchHindiTV();
}

function fetchTopRatedTV() {
    fetchTopRated('tv');
}

function fetchOnAir() {
    const cacheKey = 'onAir';
    const cachedData = cache.get(cacheKey);
    if (cachedData) { displaySlider('onAir', cachedData, 'tv'); return; }

    fetch(`${baseUrl}/tv/on_the_air?api_key=${apiKey}&language=en-US&page=1`)
        .then(response => response.ok ? response.json() : Promise.reject('On Air fetch failed'))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('onAir', data.results, 'tv');
        }).catch(err => console.error("fetchOnAir error:", err));
}

function fetchTrendingTV() {
    const cacheKey = 'trendingTV';
    const cachedData = cache.get(cacheKey);
    if (cachedData) { displaySlider('trendingTV', cachedData, 'tv'); return; }

    fetch(`${baseUrl}/trending/tv/week?api_key=${apiKey}`)
        .then(response => response.ok ? response.json() : Promise.reject('Trending TV fetch failed'))
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('trendingTV', data.results, 'tv');
        }).catch(err => console.error("fetchTrendingTV error:", err));
}


// ================ SEARCH FUNCTIONALITY ================
// ... (keep existing search functions: performSearch, setSearchType, searchContent, searchMovies, searchTVShows) ...
function performSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');
    const type = urlParams.get('type') || 'multi';

    const searchInput = document.getElementById('searchInput');
    if(searchInput && query) searchInput.value = query;

    document.querySelectorAll('.search-options .search-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick')?.includes(`'${type}'`)) {
            btn.classList.add('active');
        }
    });

    searchContent(query, type);
}

function setSearchType(type) {
     const urlParams = new URLSearchParams(window.location.search);
     const query = urlParams.get('query');
     window.location.href = `search.html?query=${encodeURIComponent(query || '')}&type=${type}`;
}


function searchContent(query, type = 'multi') {
    const searchResultsContainer = document.getElementById('searchResults');
    if (!searchResultsContainer) return;

    if (!query) {
        searchResultsContainer.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><h3>Please enter a search term.</h3></div>`;
        return;
    }

    searchResultsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    const searchUrl = `${baseUrl}/search/${type}?query=${encodeURIComponent(query)}&api_key=${apiKey}&include_adult=false&language=en-US&page=1`;

    fetch(searchUrl)
        .then(response => response.ok ? response.json() : Promise.reject(`Search fetch failed: ${response.status}`))
        .then(data => {
            if (!data.results || data.results.length === 0) {
                searchResultsContainer.innerHTML = `<div class="no-results"><i class="fas fa-meh"></i><h3>No results found for "${query}".</h3></div>`;
            } else {
                searchResultsContainer.innerHTML = data.results
                    .filter(item => type === 'multi' ? (item.media_type === 'movie' || item.media_type === 'tv') : true)
                    .map(item => {
                        const itemType = item.media_type || type;
                         if (itemType !== 'movie' && itemType !== 'tv') return '';

                        const itemId = item.id;
                        if(!itemId) return '';

                        const title = item.title || item.name;
                        const year = item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : 'N/A';
                        const overview = item.overview ? item.overview.substring(0, 180) + '...' : 'No overview available.';
                        const posterPath = item.poster_path ? `${imageBaseUrl}w185${item.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster';

                        return `
                        <div class="search-result" onclick="window.location.href='details.html?id=${itemId}&type=${itemType}'" style="cursor: pointer;">
                            <img src="${posterPath}" alt="${title}">
                            <div class="search-result-info">
                                <h3>${title || 'Untitled'}</h3>
                                <p>${itemType.toUpperCase()} • ${year}</p>
                                <p class="overview">${overview}</p>
                            </div>
                        </div>
                    `;
                    }).join('');
                 updateListButtons();
            }
        })
        .catch(error => {
            console.error("Error during search:", error);
             searchResultsContainer.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><h3>Search failed. Please try again.</h3></div>`;
        });
}

function searchMovies() {
    const query = document.getElementById('searchInput')?.value.trim();
    if (query) {
        window.location.href = `search.html?query=${encodeURIComponent(query)}`;
    }
}

function searchTVShows() {
     const query = document.getElementById('searchInput')?.value.trim();
     if (query) {
        window.location.href = `search.html?query=${encodeURIComponent(query)}&type=tv`;
    }
}


// ================ DETAILS PAGE FUNCTIONS ================
// ... (keep existing details functions: fetchDetails, displayDetails, playTrailer, playTrailerModal, closeTrailerModal, displayCastSlider, displayRecommendationsSlider) ...
function fetchDetails(id, type) {
     if (!id || !type) { console.error("fetchDetails: Missing ID or Type"); return; }

    const detailsUrl = `${baseUrl}/${type}/${id}?api_key=${apiKey}&language=en-US&append_to_response=credits,recommendations,videos,images`;

    fetch(detailsUrl)
        .then(response => response.ok ? response.json() : Promise.reject(`Details fetch failed: ${response.status}`))
        .then(data => {
            displayDetails(data, type);

            const castSlider = document.getElementById('castSlider');
            const viewAllCastBtn = document.getElementById('viewAllCast');
            if (castSlider && data.credits?.cast && data.credits.cast.length > 0) {
                 displayCastSlider(data.credits.cast);
                 if (viewAllCastBtn) {
                     viewAllCastBtn.style.display = 'block';
                     viewAllCastBtn.onclick = () => { window.location.href = `cast.html?type=${type}&id=${id}`; };
                 }
            } else {
                if(castSlider) castSlider.innerHTML = '<p>No cast information available.</p>';
                if(viewAllCastBtn) viewAllCastBtn.style.display = 'none';
            }

            const recSlider = document.getElementById('recommendationsSlider');
            const viewAllRecsBtn = document.getElementById('viewAllRecs');
            if (recSlider && data.recommendations?.results && data.recommendations.results.length > 0) {
                 displayRecommendationsSlider(data.recommendations.results, type);
                 if (viewAllRecsBtn) {
                    viewAllRecsBtn.style.display = 'block';
                    viewAllRecsBtn.onclick = () => { window.location.href = `recommendations.html?type=${type}&id=${id}`; };
                 }
            } else {
                 if(recSlider) recSlider.innerHTML = '<p>No recommendations available.</p>';
                 if(viewAllRecsBtn) viewAllRecsBtn.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching details:', error);
            const hero = document.getElementById('detailsHero');
            if (hero) hero.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i><p>Failed to load details. Please try again later.</p></div>`;
            document.getElementById('detailsContent')?.remove();
            document.querySelector('.details-actions')?.remove();
            document.querySelector('.cast-section')?.remove();
            document.querySelector('.recommendations-section')?.remove();
        });
}


function displayDetails(item, type) {
    const hero = document.getElementById('detailsHero');
    const content = document.getElementById('detailsContent');
    const actionsContainer = document.querySelector('.details-actions');

    if (!hero || !content || !actionsContainer) {
         console.error("Essential details page elements not found (detailsHero, detailsContent, details-actions).");
         return;
    }

    const itemId = item.id;
    if (!itemId) { console.error("Item data missing ID."); return; }

    const backdropUrl = item.backdrop_path ? `${imageBaseUrl}original${item.backdrop_path}` : '';
    const posterUrl = item.poster_path ? `${imageBaseUrl}w500${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster';
    const title = item.title || item.name || 'Untitled';
    const year = item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : 'N/A';
    const runtime = type === 'movie' && item.runtime ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m` : null;
    const rating = item.vote_average ? `${item.vote_average.toFixed(1)} ★` : null;
    const genres = item.genres?.map(g => g.name).join(', ') || null;

    hero.innerHTML = `
        <div class="details-backdrop" style="background-image: ${backdropUrl ? `url('${backdropUrl}')` : 'none; background-color: #111;'}"></div>
        <div class="details-overlay">
            <div class="details-poster">
                <img src="${posterUrl}" alt="${title}">
            </div>
            <div class="details-hero-content">
                <h1>${title} ${year !== 'N/A' ? `<span>(${year})</span>` : ''}</h1>
                <div class="details-meta">
                    ${runtime ? `<span>${runtime}</span>` : ''}
                    ${rating ? `<span>${rating}</span>` : ''}
                    ${genres ? `<span>${genres}</span>` : ''}
                </div>
            </div>
        </div>
    `;

    actionsContainer.innerHTML = '';

    const playBtn = document.createElement('button');
    playBtn.className = 'btn-play';
    playBtn.id = 'playTrailerBtn';
    playBtn.innerHTML = `<i class="fas fa-play"></i> Play Trailer`;
    playBtn.onclick = () => playTrailer(itemId, type);
    actionsContainer.appendChild(playBtn);

    const isListed = isInMyList(itemId, type);
    const listBtn = document.createElement('button');
    listBtn.className = `btn-list ${isListed ? 'in-list' : ''}`;
    listBtn.id = 'addToListBtn';
    listBtn.setAttribute('data-id', itemId);
    listBtn.setAttribute('data-type', type);
    listBtn.innerHTML = `
        <i class="fas ${isListed ? 'fa-check' : 'fa-plus'}"></i>
        <span class="button-text">${isListed ? 'In List' : 'Add to List'}</span>
    `;
    listBtn.onclick = function() { toggleMyList(this.getAttribute('data-id'), this.getAttribute('data-type')); };
    actionsContainer.appendChild(listBtn);

    const overview = item.overview || 'No overview available.';
    const status = item.status || 'N/A';
    const lang = item.original_language ? item.original_language.toUpperCase() : 'N/A';
    const budget = type === 'movie' && item.budget ? `$${item.budget.toLocaleString()}` : null;
    const revenue = type === 'movie' && item.revenue ? `$${item.revenue.toLocaleString()}` : null;
    const seasons = type === 'tv' ? (item.number_of_seasons ?? 'N/A') : null;
    const episodes = type === 'tv' ? (item.number_of_episodes ?? 'N/A') : null;
    const production = item.production_companies?.map(c => c.name).join(', ') || null;
    const videos = item.videos?.results?.filter(v => v.site === 'YouTube').slice(0, 4) || [];

    content.innerHTML = `
        <div class="details-info">
            <div class="details-overview">
                <h3>Overview</h3>
                <p>${overview}</p>
            </div>
            <div class="details-facts">
                <h3>Details</h3>
                <div class="facts-grid">
                    <div class="fact-item"><span class="fact-label">Status</span><span class="fact-value">${status}</span></div>
                    <div class="fact-item"><span class="fact-label">Original Language</span><span class="fact-value">${lang}</span></div>
                    ${budget ? `<div class="fact-item"><span class="fact-label">Budget</span><span class="fact-value">${budget}</span></div>` : ''}
                    ${revenue ? `<div class="fact-item"><span class="fact-label">Revenue</span><span class="fact-value">${revenue}</span></div>` : ''}
                    ${seasons !== null ? `<div class="fact-item"><span class="fact-label">Seasons</span><span class="fact-value">${seasons}</span></div>` : ''}
                    ${episodes !== null ? `<div class="fact-item"><span class="fact-label">Episodes</span><span class="fact-value">${episodes}</span></div>` : ''}
                    ${production ? `<div class="fact-item production-companies"><span class="fact-label">Production</span><span class="fact-value">${production}</span></div>` : ''}
                </div>
            </div>
            ${videos.length > 0 ? `
            <div class="details-videos">
                <h3>Videos</h3>
                <div class="videos-container">
                    ${videos.map(video => `
                        <div class="video-item" onclick="playTrailerModal('${video.key}', '${video.name || 'Video'}')">
                            <img src="https://img.youtube.com/vi/${video.key}/mqdefault.jpg" alt="${video.name || 'Video Thumbnail'}">
                            <div class="video-play"><i class="fas fa-play"></i></div>
                            <p>${video.name || 'View Video'}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;
    updateListButtons();
}


function playTrailer(id, type) {
     if (!id || !type) return;

    fetch(`${baseUrl}/${type}/${id}/videos?api_key=${apiKey}&language=en-US`)
        .then(response => response.ok ? response.json() : Promise.reject(`Trailer fetch failed: ${response.status}`))
        .then(data => {
            const videos = data.results?.filter(v => v.site === 'YouTube') || [];
            const trailer = videos.find(v => v.type === 'Trailer') || videos.find(v => v.type === 'Teaser') || videos[0];

            if (trailer) {
                playTrailerModal(trailer.key, trailer.name || `${type === 'movie' ? 'Movie' : 'TV Show'} Trailer`);
            } else {
                showToast('No trailer available for this title.');
            }
        })
        .catch(error => {
            console.error('Error fetching trailer:', error);
            showToast('Failed to load trailer.');
        });
}

function playTrailerModal(key, title) {
    closeTrailerModal();

    const modal = document.createElement('div');
    modal.className = 'trailer-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'trailerModalTitle');
    modal.innerHTML = `
        <div class="trailer-modal-content">
            <div class="trailer-modal-header">
                <h3 id="trailerModalTitle">${title}</h3>
                <button class="trailer-modal-close" onclick="closeTrailerModal()" aria-label="Close trailer">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="trailer-modal-body">
                <iframe src="https://www.youtube.com/embed/${key}?autoplay=1&rel=0" title="YouTube video player for ${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
        </div>
    `;

    modal._escapeHandler = function(event) {
        if (event.key === 'Escape') {
            closeTrailerModal();
        }
    };
    document.addEventListener('keydown', modal._escapeHandler);

    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeTrailerModal();
        }
    });

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
    const modal = document.querySelector('.trailer-modal');
    if (modal) {
         if (modal._escapeHandler) {
            document.removeEventListener('keydown', modal._escapeHandler);
         }
        const iframe = modal.querySelector('iframe');
        if (iframe) iframe.src = '';
        modal.remove();
        document.body.style.overflow = '';
    }
}

function displayCastSlider(cast) {
    const slider = document.getElementById('castSlider');
    if (!slider) return;

    slider.innerHTML = cast.slice(0, 10).map(person => {
        const personId = person.id;
        if (!personId) return '';

        const name = person.name || 'Unknown Actor';
        const character = person.character || 'Unknown Role';
        const profilePath = person.profile_path ? `${imageBaseUrl}w185${person.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image';

        return `
        <div class="slider-item cast-item" onclick="viewPersonDetails(${personId})" style="cursor: pointer; min-width: 150px; width: 150px;">
            <div class="cast-card">
                <img src="${profilePath}" alt="${name}" loading="lazy">
                <h4>${name}</h4>
                <p>${character}</p>
            </div>
        </div>
    `}).join('');
}

function displayRecommendationsSlider(recommendations, type) {
    const slider = document.getElementById('recommendationsSlider');
     if (!slider) return;

    slider.innerHTML = recommendations.slice(0, 10).map(item => {
        const itemId = item.id;
        const itemType = item.media_type || type;
         if (!itemId || (itemType !== 'movie' && itemType !== 'tv')) return '';

        const title = item.title || item.name || 'Untitled';
        const year = item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : '';
        const posterPath = item.poster_path ? `${imageBaseUrl}w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Poster';
        const isListed = isInMyList(itemId, itemType);

        return `
        <div class="slider-item recommendation-item" style="min-width: 200px; width: 200px;">
             <img src="${posterPath}" alt="${title}" loading="lazy" onclick="window.location.href='details.html?id=${itemId}&type=${itemType}'">
            <div class="slider-item-overlay">
                <h4>${title}</h4>
                <p>${year || 'N/A'}</p>
                 <div class="slider-item-buttons">
                     <button class="btn-more-info btn-small" onclick="event.stopPropagation(); window.location.href='details.html?id=${itemId}&type=${itemType}'">
                        <i class="fas fa-info-circle"></i> Info
                    </button>
                    <button class="btn-list btn-small ${isListed ? 'in-list' : ''}" data-id="${itemId}" data-type="${itemType}" onclick="event.stopPropagation(); toggleMyList(${itemId}, '${itemType}')">
                        <i class="fas ${isListed ? 'fa-check' : 'fa-plus'}"></i>
                        <span class="button-text">${isListed ? 'In List' : 'Add'}</span>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
     updateListButtons();
}


// ================ PERSON PAGE FUNCTIONS ================
// ... (keep existing person functions: fetchPersonDetails, displayPersonDetails, displayKnownForSlider) ...
function fetchPersonDetails(personId) {
     if (!personId) return;
    fetch(`${baseUrl}/person/${personId}?api_key=${apiKey}&language=en-US&append_to_response=combined_credits,images`)
        .then(response => response.ok ? response.json() : Promise.reject(`Person details fetch failed: ${response.status}`))
        .then(data => {
            displayPersonDetails(data);
            const knownForSlider = document.getElementById('knownForSlider');
            if (knownForSlider && data.combined_credits?.cast && data.combined_credits.cast.length > 0) {
                displayKnownForSlider(data.combined_credits.cast);
            } else if(knownForSlider) {
                 knownForSlider.innerHTML = '<p>No known-for titles available.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching person details:', error);
            const hero = document.getElementById('personHero');
            if (hero) hero.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i><p>Failed to load person details.</p></div>`;
            document.getElementById('personContent')?.remove();
            document.querySelector('.known-for-section')?.remove();
        });
}

function displayPersonDetails(person) {
    const hero = document.getElementById('personHero');
    const content = document.getElementById('personContent');
    if (!hero || !content) return;

    const name = person.name || 'Unknown Person';
    const profileUrl = person.profile_path ? `${imageBaseUrl}w500${person.profile_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
    const backdropUrl = person.profile_path ? `${imageBaseUrl}original${person.profile_path}` : '';

    hero.innerHTML = `
        <div class="person-hero-backdrop" style="background-image: ${backdropUrl ? `url('${backdropUrl}')` : 'none; background-color: #1a1a1a;'}"></div>
        <div class="person-hero-overlay">
            <div class="person-poster">
                <img src="${profileUrl}" alt="${name}">
            </div>
            <div class="person-hero-content">
                <h1>${name}</h1>
                <div class="person-meta" id="personMeta">
                     ${person.birthday ? `<div><i class="fas fa-birthday-cake"></i> ${new Date(person.birthday).toLocaleDateString()} ${person.deathday ? ` - ${new Date(person.deathday).toLocaleDateString()}` : ''}</div>` : ''}
                     ${person.place_of_birth ? `<div><i class="fas fa-map-marker-alt"></i> ${person.place_of_birth}</div>` : ''}
                 </div>
            </div>
        </div>
    `;

    const bio = person.biography || 'No biography available.';
    const knownFor = person.known_for_department || 'N/A';
    const gender = person.gender === 1 ? 'Female' : (person.gender === 2 ? 'Male' : 'N/A');
    const popularity = person.popularity?.toFixed(1) || 'N/A';

    content.innerHTML = `
        <div class="person-info">
            ${person.biography ? `<h2>Biography</h2><p class="person-bio">${bio}</p>` : ''}

            <h2>Personal Info</h2>
            <div class="personal-info-grid">
                <div class="personal-info-item"><span class="personal-info-label">Known For</span><span class="personal-info-value">${knownFor}</span></div>
                <div class="personal-info-item"><span class="personal-info-label">Gender</span><span class="personal-info-value">${gender}</span></div>
                <div class="personal-info-item"><span class="personal-info-label">Popularity</span><span class="personal-info-value">${popularity}</span></div>
             </div>
        </div>
    `;
}

function displayKnownForSlider(credits) {
    const slider = document.getElementById('knownForSlider');
    if (!slider) return;

    const knownFor = credits
        .filter(item => item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv'))
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 10);

    if (knownFor.length === 0) {
        slider.innerHTML = '<p>No known-for titles with posters available.</p>';
        return;
    }

    slider.innerHTML = knownFor.map(item => {
         const itemId = item.id;
         const itemType = item.media_type;
         if (!itemId) return '';

        const title = item.title || item.name || 'Untitled';
        const character = item.character ? ` as ${item.character.substring(0, 30)}${item.character.length > 30 ? '...' : ''}` : '';
        const posterPath = `${imageBaseUrl}w342${item.poster_path}`;
        const isListed = isInMyList(itemId, itemType);

        return `
        <div class="slider-item known-for-item" style="min-width: 200px; width: 200px;">
            <img src="${posterPath}" alt="${title}" loading="lazy" onclick="window.location.href='details.html?id=${itemId}&type=${itemType}'">
            <div class="slider-item-overlay">
                <h4>${title}</h4>
                <p>${character || ''}</p>
                 <div class="slider-item-buttons">
                    <button class="btn-more-info btn-small" onclick="event.stopPropagation(); window.location.href='details.html?id=${itemId}&type=${itemType}'">
                        <i class="fas fa-info-circle"></i> Info
                    </button>
                    <button class="btn-list btn-small ${isListed ? 'in-list' : ''}" data-id="${itemId}" data-type="${itemType}" onclick="event.stopPropagation(); toggleMyList(${itemId}, '${itemType}')">
                        <i class="fas ${isListed ? 'fa-check' : 'fa-plus'}"></i>
                        <span class="button-text">${isListed ? 'In List' : 'Add'}</span>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
     updateListButtons();
}


// ================ MY LIST FUNCTIONS ================

// Updated displayMyList to use the fetched list or show login message
async function displayMyList() {
    // <<< Log Start >>>
    console.log("displayMyList function CALLED."); // <<< ADD THIS LOG
    const container = document.getElementById('myListContainer');

    if (!container) {
        console.error("myListContainer element NOT FOUND!"); // <<< ADD THIS LOG
        return; // Exit if container element isn't on the page
    }

    // Use the global loggedInUsername, which should be set by checkAuth
    console.log(`displayMyList: Current LoggedInUser: ${loggedInUsername}`); // <<< ADD THIS LOG
    // Log the data it's ABOUT to render
    console.log("displayMyList: Data to render (myList):", JSON.parse(JSON.stringify(myList))); // <<< ADD THIS LOG (Deep copy for accurate logging)
    // <<< Log End >>>


    if (!loggedInUsername) {
        console.log("displayMyList: No user logged in, showing login prompt."); // <<< ADD THIS LOG
        container.innerHTML = `
            <div class="empty-list">
                <i class="fas fa-sign-in-alt"></i>
                <h3>Please Log In</h3>
                <p>Log in to view and manage your list.</p>
                <br/>
                 <a href="/auth_system/LoginRegistrationPage/index.html" class="btn-play" style="text-decoration: none; background-color: #e50914; color: white; padding: 10px 20px; border-radius: 5px;">Go to Login</a>
            </div>
        `;
        return;
    }

    // Check the GLOBAL myList array populated by checkAuth
    if (myList.length === 0) {
        console.log("displayMyList: myList is empty, showing empty message."); // <<< ADD THIS LOG
        container.innerHTML = `
            <div class="empty-list">
                <i class="fas fa-list"></i>
                <h3>Your list is empty</h3>
                <p>Add movies and TV shows using the <i class="fas fa-plus"></i> button.</p>
            </div>
        `;
    } else {
        console.log(`displayMyList: Rendering ${myList.length} list items...`); // <<< ADD THIS LOG
        const sortedList = myList; // Use default order (likely added_at DESC from PHP)

        container.innerHTML = `
            <div class="my-list-grid">
                ${sortedList.map(item => {
                    if (!item || !item.id || !item.type) {
                         console.warn("displayMyList: Skipping invalid item:", item);
                         return ''; // Don't render invalid items
                    }
                    const title = item.title || 'Untitled';
                    // Use 'date' field which corresponds to 'added_at' from PHP response
                    const year = item.date ? new Date(item.date).getFullYear() : '';
                    const posterPath = item.poster_path ? `${imageBaseUrl}w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=N/A';

                    // Debug log for each item being rendered
                    // console.log(`Rendering item: ${title} (ID: ${item.id}, Type: ${item.type}, Poster: ${item.poster_path})`);

                    return `
                    <div class="my-list-item">
                        <img src="${posterPath}"
                             alt="${title}"
                             onclick="window.location.href='details.html?id=${item.id}&type=${item.type}'"
                             style="cursor: pointer;">
                        <div class="my-list-item-overlay">
                             <h4>${title}</h4>
                            <p>${year || 'N/A'}</p> <!-- Display year added or N/A -->
                            <button class="btn-remove"
                                    onclick="event.stopPropagation(); toggleMyList(${item.id}, '${item.type}')">
                                <i class="fas fa-times"></i> Remove
                            </button>
                         </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
         console.log("displayMyList: Finished rendering items."); // <<< ADD THIS LOG
    }
    // Update buttons just in case any were rendered (e.g., if adding list buttons to My List items themselves)
    updateListButtons();
}



// ================ UTILITY / SLIDER FUNCTIONS ================
// ... (keep existing utility/slider functions: displaySlider, viewPersonDetails) ...
function displaySlider(elementId, items, type) { // type can be 'movie', 'tv', or 'multi'
    const slider = document.getElementById(elementId);
    if (!slider) { console.error(`Slider element #${elementId} not found.`); return; }
    if (!items || items.length === 0) { slider.innerHTML = '<p>No items to display.</p>'; return; }

    const isMixedType = (type === 'multi' || type === 'All'); // 'All' is legacy, prefer 'multi'

    slider.innerHTML = items.slice(0, 15).map(item => { // Show up to 15 items
        const itemType = isMixedType ? item.media_type : type; // Determine the correct type
        const itemId = item.id;

        if (!itemId || (isMixedType && itemType !== 'movie' && itemType !== 'tv')) {
            return '';
        }

        const title = item.title || item.name || 'Untitled';
        const year = item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : '';
        const posterPath = item.poster_path ? `${imageBaseUrl}w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Poster';
        const isListed = isInMyList(itemId, itemType);

        return `
        <div class="slider-item">
            <img src="${posterPath}"
                 alt="${title}"
                 loading="lazy"
                 onclick="window.location.href='details.html?id=${itemId}&type=${itemType}'"
                 style="cursor: pointer;">
            <div class="slider-item-overlay">
                <h4>${title}</h4>
                <p>${year || 'N/A'}</p>
                <div class="slider-item-buttons">
                    <button class="btn-more-info btn-small" onclick="event.stopPropagation(); window.location.href='details.html?id=${itemId}&type=${itemType}'">
                        <i class="fas fa-info-circle"></i> Info
                    </button>
                    <button class="btn-list btn-small ${isListed ? 'in-list' : ''}" data-id="${itemId}" data-type="${itemType}" onclick="event.stopPropagation(); toggleMyList(${itemId}, '${itemType}')">
                        <i class="fas ${isListed ? 'fa-check' : 'fa-plus'}"></i>
                         <span class="button-text">${isListed ? 'In List' : 'Add'}</span>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');

    const section = slider.closest('.section');
    if (section) {
        section.querySelector('.view-all-btn')?.remove();

        if (!isMixedType && type && (type === 'movie' || type === 'tv')) {
            const header = section.querySelector('h2');
            if (header) {
                const viewAllBtn = document.createElement('button');
                viewAllBtn.className = 'view-all-btn';
                viewAllBtn.textContent = 'View All';
                viewAllBtn.onclick = () => { window.location.href = `view-all.html?type=${type}&category=${elementId}`; };
                header.parentNode.insertBefore(viewAllBtn, header.nextSibling);
            }
        }
    }

    updateListButtons();
}


function viewPersonDetails(personId) {
    if(personId) window.location.href = `person.html?id=${personId}`;
}

// ================ INITIALIZATION ================

document.addEventListener('DOMContentLoaded', async function() {
    // <<< Log Start >>>
    console.log("DOM Loaded. Starting initialization...");
    await checkAuth(); // Wait for auth check and potential list fetch
    // Log list AFTER fetch inside checkAuth is completed
    console.log("checkAuth complete. Global myList:", JSON.parse(JSON.stringify(myList))); // <<< ADD THIS LOG (Deep copy for accurate logging)

    const path = window.location.pathname;
    console.log(`Current Path: ${path}`); // <<< ADD THIS LOG
    // <<< Log End >>>

    // --- Page Specific Initializations ---

    if (path.includes('home.html') || path === '/' || (path.includes('index.html') && !path.includes('LoginRegistrationPage'))) {
        console.log("Initializing Home Page");
        initHomePage();
    } else if (path.includes('movies.html')) {
        console.log("Initializing Movies Page");
        initMoviesPage();
    } else if (path.includes('tv-shows.html')) {
        console.log("Initializing TV Shows Page");
        initTVPage();
    } else if (path.includes('my-list.html')) {
        // <<< Log Start >>>
        // Specifically check for my-list.html again AFTER checkAuth
        // This ensures displayMyList runs with the populated list data
        console.log("Path is my-list.html, ensuring displayMyList runs...");
        displayMyList(); // Explicitly call it here again to be sure
        // <<< Log End >>>
    } else if (path.includes('details.html')) {
        console.log("Initializing Details Page");
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const type = urlParams.get('type');
        if (id && type) {
            fetchDetails(id, type);
        } else { console.warn("Details page missing id or type."); }
    } else if (path.includes('person.html')) {
        console.log("Initializing Person Page");
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
            fetchPersonDetails(id);
        } else { console.warn("Person page missing id."); }
    } else if (path.includes('search.html')) {
        console.log("Initializing Search Page");
        performSearch();
    } else if (path.includes('cast.html')) {
         console.log("Initializing Cast Page");
         // Logic is likely in cast.html's inline script
    } else if (path.includes('recommendations.html')) {
         console.log("Initializing Recommendations Page");
         // Logic is likely in recommendations.html's inline script
    } else if (path.includes('view-all.html')) {
        console.log("Initializing View All Page");
        // Logic is likely in view-all.html's inline script which calls loadViewAll
    }

    // --- Final UI Setup ---
    console.log("Running final UI updates (buttons, search listener).");
    updateListButtons(); // Final button state check

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchMovies(); // Navigate to search results page
            }
        });
    }

    console.log("MovieDBWebsite Initialization Complete.");
});