const apiKey = "401166b8f29da0cebc699ebd8e32c684";
const baseUrl = "https://api.themoviedb.org/3";
const imageBaseUrl = "https://image.tmdb.org/t/p/";

// Cache for storing API responses
const cache = {
    data: {},
    get: function(key) {
        return this.data[key] || null;
    },
    set: function(key, value) {
        this.data[key] = value;
    }
};

// Fetch data from TMDB API with caching
async function fetchData(endpoint) {
    // Check cache first
    const cachedData = cache.get(endpoint);
    if (cachedData) return cachedData;

    try {
        const response = await fetch(`${baseUrl}${endpoint}?api_key=${apiKey}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Cache the response
        cache.set(endpoint, data);
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}

// Display content in slider
function displayContent(items, containerId, isHero = false) {
    const container = document.getElementById(containerId);
    if (!container || !items || !items.length) {
        container.innerHTML = '<p class="no-content">No content available</p>';
        return;
    }

    container.innerHTML = items.map(item => {
        // Skip items without any images
        if (!item.poster_path && !item.backdrop_path) return '';
        
        const releaseYear = (item.release_date || item.first_air_date || '').substring(0, 4);
        const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        const title = item.title || item.name || 'Untitled';
        const imagePath = isHero ? 
            (item.backdrop_path || item.poster_path) : 
            (item.poster_path || item.backdrop_path);
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        
        return `
            <div class="item" onclick="showDetails('${item.id}', '${mediaType}')">
                <img src="${imageBaseUrl}w500${imagePath}" 
                     alt="${title}" 
                     onerror="this.src='https://via.placeholder.com/500x750?text=No+Image'">
                <div class="item-info">
                    <h3>${title}</h3>
                    <p>${releaseYear || 'N/A'} • ${mediaType === 'movie' ? 'Movie' : 'TV Show'}</p>
                    <span class="rating"><i class="fas fa-star"></i> ${rating}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Show details page
function showDetails(id, type) {
    window.location.href = `details.html?id=${id}&type=${type}`;
}

// Fetch and display details with credits and videos
async function fetchDetails(id, type) {
    try {
        const [details, credits, videos] = await Promise.all([
            fetchData(`/${type}/${id}`),
            fetchData(`/${type}/${id}/credits`),
            fetchData(`/${type}/${id}/videos`)
        ]);

        if (!details) {
            throw new Error('Details not found');
        }

        const trailer = videos?.results?.find(video => 
            video.type === "Trailer" || video.type === "Teaser"
        );
        const directors = credits?.crew?.filter(person => 
            person.job === "Director" || person.department === "Directing"
        );
        const cast = credits?.cast?.slice(0, 10); // Top 10 cast members

        displayDetails(details, type, trailer, directors, cast);
    } catch (error) {
        console.error("Error loading details:", error);
        document.getElementById('detailsContent').innerHTML = `
            <div class="error-message">
                <h2>Error loading content</h2>
                <p>There was an error loading the details. Please try again later.</p>
                <button onclick="window.location.href='home.html'">Return Home</button>
            </div>
        `;
    }
}

// Display details on the details page
function displayDetails(details, type, trailer, directors, cast) {
    // Set hero background with backdrop
    const hero = document.getElementById('detailsHero');
    if (hero) {
        hero.style.backgroundImage = details.backdrop_path ? 
            `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${imageBaseUrl}original${details.backdrop_path}')` :
            'linear-gradient(rgba(0,0,0,0.9), rgba(0,0,0,0.9))';
        hero.innerHTML = `
            <div class="hero-content">
                <h1>${details.title || details.name || 'Untitled'}</h1>
                ${trailer ? `
                <button class="btn-trailer" onclick="playTrailer('${trailer.key}')">
                    <i class="fas fa-play"></i> Play Trailer
                </button>
                ` : ''}
            </div>
        `;
    }

    const container = document.getElementById('detailsContent');
    const runtime = type === 'movie' ? 
        `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : 
        `${details.number_of_seasons} season${details.number_of_seasons !== 1 ? 's' : ''}`;

    container.innerHTML = `
        <div class="details-main">
            <div class="details-meta">
                <span>${(details.release_date || details.first_air_date || '').substring(0, 4)}</span>
                <span>${runtime || 'N/A'}</span>
                <span class="rating"><i class="fas fa-star"></i> ${details.vote_average?.toFixed(1) || 'N/A'}</span>
            </div>
            <div class="genres">
                ${details.genres?.map(genre => `<span>${genre.name}</span>`).join('') || ''}
            </div>
            <p class="tagline">${details.tagline || ''}</p>
            <h3>Overview</h3>
            <p class="overview">${details.overview || 'No overview available.'}</p>
            ${directors?.length ? `
            <h3>Director${directors.length > 1 ? 's' : ''}</h3>
            <p>${directors.map(d => d.name).join(', ')}</p>
            ` : ''}
        </div>
    `;

    // Display cast in slider
    if (cast && cast.length) {
        const castContainer = document.getElementById('castSlider');
        if (castContainer) {
            castContainer.innerHTML = cast.map(person => `
                <div class="cast-item">
                    <img src="${person.profile_path ? imageBaseUrl+'w300'+person.profile_path : 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         alt="${person.name}"
                         class="cast-image"
                         onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                    <div class="cast-info">
                        <h4>${person.name || 'Unknown'}</h4>
                        <p>${person.character || 'Unknown'}</p>
                    </div>
                </div>
            `).join('');
        }
    }
}

// Play trailer in a modal
function playTrailer(youtubeKey) {
    const modal = document.createElement('div');
    modal.className = 'trailer-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <iframe width="100%" height="100%" 
                src="https://www.youtube.com/embed/${youtubeKey}?autoplay=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        </div>
    `;
    document.body.appendChild(modal);
}

// Search content (movies, TV shows)
async function searchContent(query, type = 'multi') {
    try {
        const data = await fetchData(`/search/${type}?query=${encodeURIComponent(query)}`);
        
        if (!data?.results?.length) {
            document.getElementById('searchResults').innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No results found for "${query}"</h3>
                </div>
            `;
            return;
        }

        const results = data.results.filter(item => 
            (item.media_type !== 'person') && (item.poster_path || item.backdrop_path)
        );

        const container = document.getElementById('searchResults');
        container.innerHTML = results.map(item => {
            const mediaType = item.media_type || type;
            const title = item.title || item.name || 'Untitled';
            const releaseYear = (item.release_date || item.first_air_date || '').substring(0, 4);
            const imagePath = item.poster_path || item.backdrop_path;
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

            return `
                <div class="search-item" onclick="showDetails('${item.id}', '${mediaType}')">
                    <img src="${imageBaseUrl}w500${imagePath}" 
                         alt="${title}"
                         onerror="this.src='https://via.placeholder.com/500x750?text=No+Image'">
                    <div class="search-info">
                        <h3>${title}</h3>
                        <p>${releaseYear || 'N/A'} • ${mediaType === 'movie' ? 'Movie' : 'TV Show'}</p>
                        <p class="rating"><i class="fas fa-star"></i> ${rating}</p>
                        <p class="overview">${item.overview?.substring(0, 150) || ''}${item.overview?.length > 150 ? '...' : ''}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Error searching:", error);
        document.getElementById('searchResults').innerHTML = `
            <div class="error-message">
                <h2>Error performing search</h2>
                <p>There was an error processing your search. Please try again later.</p>
            </div>
        `;
    }
}

// Initialize homepage content
async function initHomePage() {
    try {
        // Fetch trending content
        const trending = await fetchData('/trending/all/week');
        
        // Hero slider with trending content
        const heroSlider = document.getElementById('heroSlider');
        if (trending?.results) {
            const heroItems = trending.results.filter(item => item.backdrop_path).slice(0, 5);
            heroSlider.innerHTML = heroItems.map(item => {
                const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                return `
                    <div class="hero-slide" style="background-image: url('${imageBaseUrl}original${item.backdrop_path}')">
                        <div class="hero-content">
                            <h2>${item.title || item.name}</h2>
                            <p>${item.overview?.substring(0, 150) || 'No description available'}${item.overview?.length > 150 ? '...' : ''}</p>
                            <button onclick="showDetails('${item.id}', '${mediaType}')">
                                <i class="fas fa-info-circle"></i> View Details
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Fetch different categories
        const [popularMovies, topRated, nowPlaying] = await Promise.all([
            fetchData('/movie/popular'),
            fetchData('/movie/top_rated'),
            fetchData('/movie/now_playing')
        ]);

        // Display sections
        displayContent(trending?.results, 'trending');
        displayContent(popularMovies?.results, 'popularMovies');
        displayContent(topRated?.results, 'topRated');
        displayContent(nowPlaying?.results, 'nowPlaying');
    } catch (error) {
        console.error("Error initializing homepage:", error);
    }
}

// Initialize movies page
async function initMoviesPage() {
    try {
        const [popularMovies, topRated, nowPlaying, upcoming] = await Promise.all([
            fetchData('/movie/popular'),
            fetchData('/movie/top_rated'),
            fetchData('/movie/now_playing'),
            fetchData('/movie/upcoming')
        ]);

        displayContent(popularMovies?.results, 'popularMovies');
        displayContent(topRated?.results, 'topRated');
        displayContent(nowPlaying?.results, 'nowPlaying');
        displayContent(upcoming?.results, 'upcoming');
    } catch (error) {
        console.error("Error initializing movies page:", error);
    }
}

// Initialize TV shows page
async function initTVPage() {
    try {
        const [popularTV, topRatedTV, onAir, trendingTV] = await Promise.all([
            fetchData('/tv/popular'),
            fetchData('/tv/top_rated'),
            fetchData('/tv/on_the_air'),
            fetchData('/trending/tv/week')
        ]);

        displayContent(popularTV?.results, 'popularTV');
        displayContent(topRatedTV?.results, 'topRatedTV');
        displayContent(onAir?.results, 'onAir');
        displayContent(trendingTV?.results, 'trendingTV');
    } catch (error) {
        console.error("Error initializing TV page:", error);
    }
}

// Hero slider functionality
let currentHeroSlide = 0;
let heroSlides = [];

function slideHero(direction) {
    const slider = document.querySelector('.hero-slider');
    heroSlides = document.querySelectorAll('.hero-slide');
    
    if (!heroSlides.length) return;
    
    currentHeroSlide = (currentHeroSlide + direction + heroSlides.length) % heroSlides.length;
    slider.style.transform = `translateX(-${currentHeroSlide * 100}%)`;
    updateHeroIndicators();
}

function updateHeroIndicators() {
    const indicators = document.getElementById('heroIndicators');
    if (!indicators) return;
    
    indicators.innerHTML = Array.from(heroSlides).map((_, index) => 
        `<span class="${index === currentHeroSlide ? 'active' : ''}" 
              onclick="goToHeroSlide(${index})"></span>`
    ).join('');
}

function goToHeroSlide(index) {
    currentHeroSlide = index;
    const slider = document.getElementById('heroSlider');
    slider.style.transform = `translateX(-${currentHeroSlide * 100}%)`;
    updateHeroIndicators();
}

// Auto-advance hero slider
let heroInterval;

function startHeroSlider() {
    heroInterval = setInterval(() => {
        slideHero(1);
    }, 5000);
}

// Initialize appropriate page based on URL
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop();
    
    if (path === 'home.html' || path === '') {
        initHomePage();
        startHeroSlider();
    } else if (path === 'movies.html') {
        initMoviesPage();
    } else if (path === 'tv-shows.html') {
        initTVPage();
    } else if (path === 'details.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const type = urlParams.get('type');
        if (id && type) {
            fetchDetails(id, type);
        }
    } else if (path === 'search.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('query');
        const type = urlParams.get('type') || 'multi';
        if (query) {
            searchContent(query, type);
        }
    }
});

// Clear interval when leaving page
window.addEventListener('beforeunload', () => {
    if (heroInterval) clearInterval(heroInterval);
});