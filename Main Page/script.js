const apiKey = "f456c8ea"; // Replace with your OMDB API key
const baseUrl = `http://www.omdbapi.com/?apikey=${apiKey}`;

// Data for Movies Page
const moviesData = {
    yourNextWatch: [
        "Dabba Cartel", "Squid Game", "Money Heist", "Stranger Things", 
        "Breaking Bad", "Heeramandi: The Diamond Bazaar", "Vikings"
    ],
    goofyComedyMovies: [
        "Bhool Bhulaiyaa 3", "Vicky Vidya ka Woh Wala Video", "Dream Girl 2", 
        "Plankton: The Movie", "Don", "The Boss Baby", "Wild Wild Punjab"
    ],
    madeInIndia: [
        "Nadaaniyan", "VidaaMuyarchi", "Thandel", "Pushpa 2: The Rule (Reloaded Version)", 
        "Lucky Baskhar", "Daaku Maharaaj", "Bhool Bhulaiyaa 3", "Dhoom Dhaam", 
        "Kadhalikka Neramillai", "GOAT - The Greatest of All Time", "Amaran", 
        "Laapataa Ladies", "Indian 2", "Meiyazhagan", "Devara", "Crew", "Thangalaan", 
        "Article 370", "'83", "Fighter", "Saripodhaa Sanivaaram", "Animal", 
        "Bade Miyan Chote Miyan", "Do Patti", "Kalki 2898 AD (Hindi)", "Jawan: Extended Cut", 
        "Vicky Vidya ka Woh Wala Video", "Shaitaan", "Maharaja", "Khel Khel Mein", 
        "Mission Raniganj: The Great Bharat Rescue", "Mission Majnu", "Dunki", 
        "Leo (Hindi)", "Raw (Hindi)", "Phir Aayi Hasseen Dillruba", "Guntur Kaaram (Hindi)", 
        "Sector 36", "Guntur Kaaram", "CBI 5: The Brain"
    ],
    goodLaugh: [
        "Dhoom Dhaam", "Bhool Bhulaiyaa 3", "Laapataa Ladies", "Crew", 
        "Vicky Vidya ka Woh Wala Video", "Khel Khel Mein", "Dunki", 
        "Chillar Party", "Dream Girl 2", "Khushi (Hindi)", "OMG 2", 
        "Don", "Wild Wild Punjab", "Mad", "Zindagi Na Milegi Dobara", 
        "Meenakshi Sundareshwar", "Darlings", "Ginny Weds Sunny", 
        "Mathu Vadalara 2", "Shehzada", "Tu Jhoothi Main Makkaar", 
        "Veere Di Wedding", "Chandramukhi 2 (Hindi)", "Rifle Club", 
        "Yeh Jawaani Hai Deewani", "Wake Up Sid", "Miss Shetty Mr. Polishetty", 
        "Sukhee", "Laal Singh Chaddha", "Aay", "Minnal Murali", "Mimi", 
        "Jaadugar", "Goodbye", "Doctor G", "Double XL", "Bajrangi Bhaijaan", 
        "Murder Mubarak", "Kal Ho Naa Ho", "Om Shanti Om"
    ],
    thrillerMovies: [
        "Article 370", "Do Patti", "Sector 36", "Phir Aayi Hasseen Dillruba", 
        "CBI 5: The Brain", "Bhool Bhulaiyaa", "Haseen Dillruba", 
        "Sikandar Ka Muqaddar", "Darlings", "Gumraah", "HIT: The First Case", 
        "Jaane Jaan", "The Girl on the Train", "Dhokha - Round D Corner", 
        "Chor Nikal Ke Bhaga", "Mrs. Serial Killer", "Boomika (Hindi)", 
        "Iraivan", "Khufiya", "CTRL", "Talaash", "Mili", "Bhakshak", 
        "Karthik Calling Karthik", "Operation Mayfair", "Vadh", "Article 15", 
        "Merry Christmas (Hindi)", "Madras Café", "Anaamika", "Dhamaka", 
        "Godse", "Raat Akeli Hai", "Mom", "Class of '83", "Badla", 
        "Sajini Shinde Ka Viral Video", "Foot Fairy (Hindi)", "Butta Bomma", 
        "Iratta"
    ]
};

// Data for TV Shows Page
const tvShowsData = {
    crimeThriller: [
        "Sacred Games", "Mirzapur", "Paatal Lok", "Delhi Crime", "Criminal Justice", 
        "Breathe", "Asur", "She", "The Family Man", "Special OPS", 
        "Rangbaaz", "Apharan", "Hostages", "Jamtara", "Abhay", 
        "Mumbhai", "The Great Indian Murder", "Undekhi", "The Night Manager", 
        "Bard of Blood", "Inside Edge", "Kaafir", "Code M", "Poison", 
        "Crackdown"
    ],
    drama: [
        "Made in Heaven", "Kota Factory", "Panchayat", "Scam 1992", "Rocket Boys", 
        "Jubilee", "The Crown", "Succession", "This Is Us", "The Handmaid's Tale", 
        "Big Little Lies", "Euphoria", "Mare of Easttown", "Aarya", "Outlander", 
        "The Queen's Gambit", "The Morning Show", "Little Things", "Four More Shots Please!", 
        "Bombay Begums", "Delhi Crime", "Tandav", "Breathe: Into the Shadows", 
        "The Test Case", "City of Dreams"
    ],
    romanticComedy: [
        "The Office", "Brooklyn Nine-Nine", "Panchayat", "Kota Factory", "Gullak", 
        "Schitt's Creek", "The Marvelous Mrs. Maisel", "Fleabag", "The Big Bang Theory", 
        "Friends", "How I Met Your Mother", "Parks and Recreation", "The Good Place", 
        "Young Sheldon", "The Kapil Sharma Show", "Comicstaan", "Chacha Vidhayak Hain Humare"
    ],
    comedy: [
        "The Office", "Brooklyn Nine-Nine", "Panchayat", "Kota Factory", "Gullak", 
        "Schitt's Creek", "The Marvelous Mrs. Maisel", "Fleabag", "The Big Bang Theory", 
        "Friends", "How I Met Your Mother", "Parks and Recreation", "The Good Place", 
        "Young Sheldon", "The Kapil Sharma Show", "Comicstaan", "Chacha Vidhayak Hain Humare"
    ]
};

// Fetch movies from OMDB API
async function fetchMovies(movieList, containerId) {
    const moviePromises = movieList.map(movie => fetch(`${baseUrl}&t=${encodeURIComponent(movie)}`));
    const responses = await Promise.all(moviePromises);
    const moviesData = await Promise.all(responses.map(res => res.json()));

    const validMovies = moviesData.filter(movie => movie.Response === "True");

    if (validMovies.length > 0) {
        displayMovies(validMovies, containerId);
    }
}

// Display movies in the slider
function displayMovies(movies, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = "";

        movies.forEach((movie) => {
            if (movie.Poster !== "N/A") {
                const movieCard = `
                    <div class="box" onclick="showDetails('${movie.imdbID}')">
                        <img src="${movie.Poster}" alt="${movie.Title}">
                        <h3>${movie.Title} (${movie.Year})</h3>
                    </div>
                `;
                container.innerHTML += movieCard;
            }
        });
    }
}

// Fetch TV shows from OMDB API
async function fetchTVShows(showList, containerId) {
    const showPromises = showList.map(show => fetch(`${baseUrl}&t=${encodeURIComponent(show)}&type=series`));
    const responses = await Promise.all(showPromises);
    const showsData = await Promise.all(responses.map(res => res.json()));

    const validShows = showsData.filter(show => show.Response === "True");

    if (validShows.length > 0) {
        displayTVShows(validShows, containerId);
    }
}

// Display TV shows in the slider
function displayTVShows(shows, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = "";

        shows.forEach((show) => {
            if (show.Poster !== "N/A") {
                const showCard = `
                    <div class="box" onclick="showDetails('${show.imdbID}')">
                        <img src="${show.Poster}" alt="${show.Title}">
                        <h3>${show.Title} (${show.Year})</h3>
                    </div>
                `;
                container.innerHTML += showCard;
            }
        });
    }
}

// Fetch data for Movies Page sections
function fetchMoviesPageData() {
    fetchMovies(moviesData.yourNextWatch, "yourNextWatch");
    fetchMovies(moviesData.goofyComedyMovies, "goofyComedyMovies");
    fetchMovies(moviesData.madeInIndia, "madeInIndia");
    fetchMovies(moviesData.goodLaugh, "goodLaugh");
    fetchMovies(moviesData.thrillerMovies, "thrillerMovies");
}

// Fetch data for TV Shows Page sections
function fetchTVShowsPageData() {
    fetchTVShows(tvShowsData.crimeThriller, "crimeThriller");
    fetchTVShows(tvShowsData.drama, "drama");
    fetchTVShows(tvShowsData.romanticComedy, "romanticComedy");
    fetchTVShows(tvShowsData.comedy, "comedy");
}

// Initialize data fetching based on the current page
function initializePage() {
    const currentPage = window.location.pathname.split("/").pop();

    if (currentPage === "movies.html") {
        fetchMoviesPageData();
    } else if (currentPage === "tv-shows.html") {
        fetchTVShowsPageData();
    } else if (currentPage === "details.html") {
        const imdbID = new URLSearchParams(window.location.search).get("id");
        if (imdbID) {
            fetchDetails(imdbID);
        }
    } else {
        // Default to homepage
        fetchMovies(moviesData.yourNextWatch, "featuredToday");
        fetchMovies(moviesData.madeInIndia, "whatToWatch");
        fetchMovies(moviesData.thrillerMovies, "top10");
        fetchMovies(moviesData.goodLaugh, "fanFavorites");
    }
}

// Fetch details for a specific movie or TV show
async function fetchDetails(imdbID) {
    const response = await fetch(`${baseUrl}&i=${imdbID}`);
    const data = await response.json();

    if (data.Response === "True") {
        displayDetails(data);
    }
}

// Display details on the details page
function displayDetails(details) {
    const container = document.getElementById("detailsContent");
    if (container) {
        container.innerHTML = `
            <div class="details-poster">
                <img src="${details.Poster}" alt="${details.Title}">
            </div>
            <div class="details-info">
                <h1>${details.Title} (${details.Year})</h1>
                <p class="tagline">${details.Plot}</p>
                <p><strong>Rated:</strong> ${details.Rated}</p>
                <p><strong>Released:</strong> ${details.Released}</p>
                <p><strong>Runtime:</strong> ${details.Runtime}</p>
                <p><strong>Genre:</strong> ${details.Genre}</p>
                <p><strong>Director:</strong> ${details.Director}</p>
                <p><strong>Writer:</strong> ${details.Writer}</p>
                <p><strong>Actors:</strong> ${details.Actors}</p>
                <p><strong>Language:</strong> ${details.Language}</p>
                <p><strong>Country:</strong> ${details.Country}</p>
                <p><strong>Awards:</strong> ${details.Awards}</p>
                <p class="rating">Rating: ${details.imdbRating}/10</p>
                <p class="reviews">${details.imdbVotes} reviews</p>
                <div class="buttons">
                    <button class="play-trailer" onclick="playTrailer('${details.Title}')">Play Trailer</button>
                    <button class="more-info" onclick="showMoreInfo('${details.imdbID}')">More Info</button>
                </div>
            </div>
        `;
    }
}

// Play trailer (opens directly without confirmation)
function playTrailer(title) {
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(title + " trailer")}`, "_blank");
}

// Show more info (opens directly without confirmation)
function showMoreInfo(imdbID) {
    window.open(`https://www.imdb.com/title/${imdbID}`, "_blank");
}

// Redirect to details page with IMDb ID
function showDetails(imdbID) {
    window.location.href = `details.html?id=${imdbID}`;
}

// Fetch and display Featured Today movies
function fetchFeaturedToday() {
    const featuredMovies = moviesData.yourNextWatch.slice(0, 10); // Show first 10 movies
    fetchMovies(featuredMovies, "featuredToday");
}

// Search movies
async function searchMovies() {
    const searchInput = document.getElementById("searchInput").value;
    if (searchInput) {
        const response = await fetch(`${baseUrl}&s=${encodeURIComponent(searchInput)}`);
        const data = await response.json();

        if (data.Search) {
            document.getElementById("featuredToday").innerHTML = "";
            displayMovies(data.Search, "featuredToday");
        }
    }
}

// Search TV shows
async function searchTVShows() {
    const searchInput = document.getElementById("searchInput").value;
    if (searchInput) {
        const response = await fetch(`${baseUrl}&s=${encodeURIComponent(searchInput)}&type=series`);
        const data = await response.json();

        if (data.Search) {
            document.getElementById("crimeThriller").innerHTML = "";
            displayTVShows(data.Search, "crimeThriller");
        }
    }
}

// Slider functionality
function slideLeft(containerId) {
    const container = document.getElementById(containerId);
    container.scrollBy({ left: -300, behavior: 'smooth' });
}

function slideRight(containerId) {
    const container = document.getElementById(containerId);
    container.scrollBy({ left: 300, behavior: 'smooth' });
}

// ==============================
// LOGIN/REGISTRATION TOGGLE
// ==============================
const loginContainer = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

if (registerBtn && loginBtn) {
    registerBtn.addEventListener('click', () => {
        loginContainer.classList.add('active');
    });

    loginBtn.addEventListener('click', () => {
        loginContainer.classList.remove('active');
    });
}

// Call initializePage when the script loads
document.addEventListener("DOMContentLoaded", initializePage);