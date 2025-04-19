// API Configuration
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

// My List functionality
let myList = JSON.parse(localStorage.getItem('myList')) || [];

// ================ GENERAL FUNCTIONS ================

// Check if item is in My List
function isInMyList(id) {
    return myList.some(item => item.id === id);
}

// Toggle item in My List
function toggleMyList(id, type) {
    const index = myList.findIndex(item => item.id === id);
    
    if (index === -1) {
        // Add to list
        fetch(`${baseUrl}/${type}/${id}?api_key=${apiKey}`)
            .then(response => response.json())
            .then(data => {
                myList.push({
                    id: data.id,
                    title: data.title || data.name,
                    poster_path: data.poster_path,
                    type: type,
                    date: data.release_date || data.first_air_date
                });
                localStorage.setItem('myList', JSON.stringify(myList));
                updateListButtons();
                if (window.location.pathname.includes('my-list.html')) {
                    displayMyList();
                }
                showToast(`${data.title || data.name} added to My List`);
            });
    } else {
        // Remove from list
        const removedItem = myList[index];
        myList.splice(index, 1);
        localStorage.setItem('myList', JSON.stringify(myList));
        updateListButtons();
        if (window.location.pathname.includes('my-list.html')) {
            displayMyList();
        }
        showToast(`${removedItem.title} removed from My List`);
    }
}

// Show toast notification
function showToast(message) {
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
            toast.remove();
        }, 300);
    }, 3000);
}

// Update My List buttons across the site
function updateListButtons() {
    document.querySelectorAll('.btn-list').forEach(btn => {
        const id = parseInt(btn.getAttribute('data-id'));
        const icon = btn.querySelector('i');
        const text = btn.querySelector('span') || document.createElement('span');
        
        if (isInMyList(id)) {
            icon.classList.remove('fa-plus');
            icon.classList.add('fa-check');
            text.textContent = 'In List';
            btn.classList.add('in-list');
        } else {
            icon.classList.remove('fa-check');
            icon.classList.add('fa-plus');
            text.textContent = 'Add to List';
            btn.classList.remove('in-list');
        }
        
        if (!btn.contains(text)) {
            btn.appendChild(document.createTextNode(' '));
            btn.appendChild(text);
        }
    });
}

// ================ HERO SLIDER FUNCTIONS ================

let currentHeroSlide = 0;

function fetchHeroSlider() {
    const cacheKey = 'heroSlider';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displayHeroSlider(cachedData);
        return;
    }

    fetch(`${baseUrl}/trending/all/week?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displayHeroSlider(data.results);
        })
        .catch(error => {
            console.error('Error fetching hero slider:', error);
            document.getElementById('heroSlider').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load featured content. Please try again later.</p>
                </div>
            `;
        });
}

function displayHeroSlider(items) {
    const slider = document.getElementById('heroSlider');
    const indicators = document.getElementById('heroIndicators');
    
    if (!items || items.length === 0) {
        slider.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>No featured content available at this time.</p>
            </div>
        `;
        return;
    }
    
    slider.innerHTML = items.slice(0, 5).map((item, index) => `
        <div class="hero-slide ${index === 0 ? 'active' : ''}" style="background-image: url('${imageBaseUrl}original${item.backdrop_path}')">
            <div class="hero-content">
                <h1>${item.title || item.name}</h1>
                <p>${item.overview ? item.overview.substring(0, 150) + '...' : 'No description available.'}</p>
                <div class="hero-buttons">
                    <button class="btn-play" onclick="window.location.href='details.html?id=${item.id}&type=${item.media_type}'">
                        <i class="fas fa-play"></i> Play Trailer
                    </button>
                    <button class="btn-list" data-id="${item.id}" onclick="event.stopPropagation(); toggleMyList(${item.id}, '${item.media_type}')">
                        <i class="fas ${isInMyList(item.id) ? 'fa-check' : 'fa-plus'}"></i> ${isInMyList(item.id) ? 'In List' : 'Add to List'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    indicators.innerHTML = items.slice(0, 5).map((_, index) => `
        <button class="hero-indicator ${index === 0 ? 'active' : ''}" onclick="goToHeroSlide(${index})"></button>
    `).join('');
}

function slideHero(direction) {
    const slides = document.querySelectorAll('.hero-slide');
    const indicators = document.querySelectorAll('.hero-indicator');
    
    slides[currentHeroSlide].classList.remove('active');
    indicators[currentHeroSlide].classList.remove('active');
    
    currentHeroSlide = (currentHeroSlide + direction + slides.length) % slides.length;
    
    slides[currentHeroSlide].classList.add('active');
    indicators[currentHeroSlide].classList.add('active');
}

function goToHeroSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const indicators = document.querySelectorAll('.hero-indicator');
    
    slides[currentHeroSlide].classList.remove('active');
    indicators[currentHeroSlide].classList.remove('active');
    
    currentHeroSlide = index;
    
    slides[currentHeroSlide].classList.add('active');
    indicators[currentHeroSlide].classList.add('active');
}

// ================ VIEW ALL FUNCTIONS ================

function loadViewAll() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const category = urlParams.get('category');
    
    if (!type || !category) {
        window.location.href = 'home.html';
        return;
    }
    
    document.title = `MovieDB - ${category.replace(/([A-Z])/g, ' $1').trim()}`;
    
    const header = document.querySelector('.view-all-header h1');
    if (header) {
        header.textContent = category.replace(/([A-Z])/g, ' $1').trim();
    }
    
    // Fetch data based on category
    const endpoints = {
        trending: `${baseUrl}/trending/${type}/week?api_key=${apiKey}`,
        popularMovies: `${baseUrl}/movie/popular?api_key=${apiKey}`,
        hindiMovies: `${baseUrl}/discover/movie?with_original_language=hi&api_key=${apiKey}`,
        topRated: `${baseUrl}/${type}/top_rated?api_key=${apiKey}`,
        hindiTV: `${baseUrl}/discover/tv?with_original_language=hi&api_key=${apiKey}`,
        nowPlaying: `${baseUrl}/movie/now_playing?api_key=${apiKey}`,
        upcoming: `${baseUrl}/movie/upcoming?api_key=${apiKey}`,
        popularTV: `${baseUrl}/tv/popular?api_key=${apiKey}`,
        topRatedTV: `${baseUrl}/tv/top_rated?api_key=${apiKey}`,
        onAir: `${baseUrl}/tv/on_the_air?api_key=${apiKey}`,
        trendingTV: `${baseUrl}/trending/tv/week?api_key=${apiKey}`
    };

    if (endpoints[category]) {
        fetch(endpoints[category])
            .then(response => response.json())
            .then(data => displayViewAll(data.results, type))
            .catch(error => console.error('Error:', error));
    }
}

function displayViewAll(items, type) {
    const grid = document.getElementById('viewAllGrid');
    if (!grid) return;
    
    grid.innerHTML = items.map(item => `
        <div class="view-all-item">
            <img src="${item.poster_path ? `${imageBaseUrl}w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Poster'}" 
                 alt="${item.title || item.name}" 
                 onclick="window.location.href='details.html?id=${item.id}&type=${type}'">
            <div class="view-all-item-overlay">
                <h3>${item.title || item.name}</h3>
                <p>${new Date(item.release_date || item.first_air_date).getFullYear() || ''}</p>
                <div class="view-all-item-buttons">
                    <button class="btn-more-info" onclick="event.stopPropagation(); window.location.href='details.html?id=${item.id}&type=${type}'">
                        <i class="fas fa-info-circle"></i> More Info
                    </button>
                    <button class="btn-list" data-id="${item.id}" onclick="event.stopPropagation(); toggleMyList(${item.id}, '${type}')">
                        <i class="fas ${isInMyList(item.id) ? 'fa-check' : 'fa-plus'}"></i> ${isInMyList(item.id) ? 'In List' : 'Add to List'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ================ HOME PAGE FUNCTIONS ================

function initHomePage() {
    // Clear any previous errors
    const sections = ['trending', 'popularMovies', 'hindiMovies', 'topRated', 'hindiTV'];
    sections.forEach(section => {
        const el = document.getElementById(section);
        if (el) el.innerHTML = '<div class="loading">Loading...</div>';
    });

    fetchTrending();
    fetchPopularMovies();
    fetchHindiMovies();
    fetchTopRated();
    fetchHindiTV();
    fetchHeroSlider();
    
    // Add event listener for Enter key in search
    document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMovies();
        }
    });
}

function fetchTrending() {
    const cacheKey = 'trending';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('trending', cachedData, 'All');
        return;
    }

    fetch(`${baseUrl}/trending/all/week?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('trending', data.results, 'All');
        });
}

function fetchPopularMovies() {
    const cacheKey = 'popularMovies';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('popularMovies', cachedData, 'movie');
        return;
    }

    fetch(`${baseUrl}/movie/popular?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('popularMovies', data.results, 'movie');
        });
}

function fetchHindiMovies() {
    const cacheKey = 'hindiMovies';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('hindiMovies', cachedData, 'movie');
        return;
    }

    fetch(`${baseUrl}/discover/movie?with_original_language=hi&sort_by=popularity.desc&region=IN&api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('hindiMovies', data.results, 'movie');
        });
}

function fetchTopRated() {
    const cacheKey = 'topRated';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('topRated', cachedData, 'movie');
        return;
    }

    fetch(`${baseUrl}/movie/top_rated?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('topRated', data.results, 'movie');
        });
}

function fetchHindiTV() {
    const cacheKey = 'hindiTV';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('hindiTV', cachedData, 'tv');
        return;
    }

    fetch(`${baseUrl}/discover/tv?with_original_language=hi&sort_by=popularity.desc&region=IN&api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('hindiTV', data.results, 'tv');
        });
}

// ================ MOVIES PAGE FUNCTIONS ================

function initMoviesPage() {
    fetchNowPlaying();
    fetchPopularMoviesPage();
    fetchHindiMoviesPage();
    fetchTopRatedMovies();
    fetchUpcoming();
    
    document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMovies();
        }
    });
}

function fetchNowPlaying() {
    const cacheKey = 'nowPlaying';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('nowPlaying', cachedData, 'movie');
        return;
    }

    fetch(`${baseUrl}/movie/now_playing?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('nowPlaying', data.results, 'movie');
        });
}

function fetchPopularMoviesPage() {
    const cacheKey = 'popularMoviesPage';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('popularMovies', cachedData, 'movie');
        return;
    }

    fetch(`${baseUrl}/movie/popular?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('popularMovies', data.results, 'movie');
        });
}

function fetchHindiMoviesPage() {
    const cacheKey = 'hindiMoviesPage';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('hindiMovies', cachedData, 'movie');
        return;
    }

    fetch(`${baseUrl}/discover/movie?with_original_language=hi&sort_by=popularity.desc&region=IN&api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('hindiMovies', data.results, 'movie');
        });
}

function fetchTopRatedMovies() {
    const cacheKey = 'topRatedMovies';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('topRated', cachedData, 'movie');
        return;
    }

    fetch(`${baseUrl}/movie/top_rated?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('topRated', data.results, 'movie');
        });
}

function fetchUpcoming() {
    const cacheKey = 'upcoming';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('upcoming', cachedData, 'movie');
        return;
    }

    fetch(`${baseUrl}/movie/upcoming?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('upcoming', data.results, 'movie');
        });
}

// ================ TV SHOWS PAGE FUNCTIONS ================

function initTVPage() {
    fetchPopularTV();
    fetchHindiTVPage();
    fetchTopRatedTV();
    fetchOnAir();
    fetchTrendingTV();
    
    document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchTVShows();
        }
    });
}

function fetchPopularTV() {
    const cacheKey = 'popularTV';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('popularTV', cachedData, 'tv');
        return;
    }

    fetch(`${baseUrl}/tv/popular?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('popularTV', data.results, 'tv');
        });
}

function fetchHindiTVPage() {
    const cacheKey = 'hindiTVPage';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('hindiTV', cachedData, 'tv');
        return;
    }

    fetch(`${baseUrl}/discover/tv?with_original_language=hi&sort_by=popularity.desc&region=IN&api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('hindiTV', data.results, 'tv');
        });
}

function fetchTopRatedTV() {
    const cacheKey = 'topRatedTV';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('topRatedTV', cachedData, 'tv');
        return;
    }

    fetch(`${baseUrl}/tv/top_rated?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('topRatedTV', data.results, 'tv');
        });
}

function fetchOnAir() {
    const cacheKey = 'onAir';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('onAir', cachedData, 'tv');
        return;
    }

    fetch(`${baseUrl}/tv/on_the_air?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('onAir', data.results, 'tv');
        });
}

function fetchTrendingTV() {
    const cacheKey = 'trendingTV';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displaySlider('trendingTV', cachedData, 'tv');
        return;
    }

    fetch(`${baseUrl}/trending/tv/week?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            cache.set(cacheKey, data.results);
            displaySlider('trendingTV', data.results, 'tv');
        });
}

// ================ SEARCH FUNCTIONALITY ================

function searchContent(query, type = 'multi') {
    const searchResults = document.getElementById('searchResults');
    
    if (!query) {
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>Enter a search term to find movies and TV shows</h3>
            </div>
        `;
        return;
    }

    searchResults.innerHTML = '<div class="loading">Searching...</div>';

    fetch(`${baseUrl}/search/${type}?query=${encodeURIComponent(query)}&api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            if (data.results.length === 0) {
                searchResults.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <h3>No results found for "${query}"</h3>
                    </div>
                `;
            } else {
                searchResults.innerHTML = data.results.map(item => `
                    <div class="search-result" onclick="window.location.href='details.html?id=${item.id}&type=${item.media_type || type}'">
                        <img src="${item.poster_path ? `${imageBaseUrl}w185${item.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'}" alt="${item.title || item.name}">
                        <div class="search-result-info">
                            <h3>${item.title || item.name}</h3>
                            <p>${(item.media_type || type).toUpperCase()} • ${new Date(item.release_date || item.first_air_date).getFullYear() || 'N/A'}</p>
                            <p class="overview">${item.overview ? item.overview.substring(0, 150) + '...' : 'No overview available.'}</p>
                        </div>
                    </div>
                `).join('');
            }
        });
}

function searchMovies() {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        window.location.href = `search.html?query=${encodeURIComponent(query)}`;
    }
}

function searchTVShows() {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        window.location.href = `search.html?query=${encodeURIComponent(query)}&type=tv`;
    }
}

// ================ DETAILS PAGE FUNCTIONS ================

function fetchDetails(id, type) {
    fetch(`${baseUrl}/${type}/${id}?api_key=${apiKey}&append_to_response=credits,recommendations,videos,images`)
        .then(response => response.json())
        .then(data => {
            displayDetails(data, type);
            
            // Display cast
            if (data.credits && data.credits.cast) {
                displayCast(data.credits.cast);
                document.getElementById('viewAllCast').onclick = () => {
                    window.location.href = `cast.html?type=${type}&id=${id}`;
                };
            }
            
            // Display recommendations
            if (data.recommendations && data.recommendations.results) {
                displayRecommendations(data.recommendations.results, type);
                document.getElementById('viewAllRecs').onclick = () => {
                    window.location.href = `recommendations.html?type=${type}&id=${id}`;
                };
            }
        })
        .catch(error => {
            console.error('Error fetching details:', error);
            document.getElementById('detailsHero').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load details. Please try again later.</p>
                </div>
            `;
        });
}

function displayDetails(item, type) {
    const hero = document.getElementById('detailsHero');
    const content = document.getElementById('detailsContent');
    
    // Hero section with backdrop
    const backdropUrl = item.backdrop_path 
        ? `${imageBaseUrl}original${item.backdrop_path}` 
        : 'https://via.placeholder.com/1920x1080?text=No+Backdrop';
    
    hero.innerHTML = `
        <div class="details-backdrop" style="background-image: url('${backdropUrl}')"></div>
        <div class="details-overlay">
            <div class="details-poster">
                <img src="${item.poster_path ? `${imageBaseUrl}w500${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster'}" alt="${item.title || item.name}">
            </div>
            <div class="details-hero-content">
                <h1>${item.title || item.name} <span>(${new Date(item.release_date || item.first_air_date).getFullYear()})</span></h1>
                <div class="details-meta">
                    ${type === 'movie' ? `<span>${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m</span>` : ''}
                    <span>${item.vote_average.toFixed(1)} ★</span>
                    <span>${item.genres.map(g => g.name).join(', ')}</span>
                </div>
                <div class="details-actions">
                    <button class="btn-play" id="playTrailerBtn">
                        <i class="fas fa-play"></i> Play Trailer
                    </button>
                    <button class="btn-list" id="addToListBtn" data-id="${item.id}" data-type="${type}">
                        <i class="fas ${isInMyList(item.id) ? 'fa-check' : 'fa-plus'}"></i> ${isInMyList(item.id) ? 'In List' : 'Add to List'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('playTrailerBtn').addEventListener('click', () => playTrailer(item.id, type));
    document.getElementById('addToListBtn').addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const type = this.getAttribute('data-type');
        toggleMyList(id, type);
    });
    
    // Main content section
    content.innerHTML = `
        <div class="details-info">
            <div class="details-overview">
                <h3>Overview</h3>
                <p>${item.overview || 'No overview available.'}</p>
            </div>
            
            <div class="details-facts">
                <h3>Details</h3>
                <div class="facts-grid">
                    <div class="fact-item">
                        <span class="fact-label">Status</span>
                        <span class="fact-value">${item.status || 'N/A'}</span>
                    </div>
                    <div class="fact-item">
                        <span class="fact-label">Original Language</span>
                        <span class="fact-value">${item.original_language ? item.original_language.toUpperCase() : 'N/A'}</span>
                    </div>
                    ${type === 'movie' ? `
                    <div class="fact-item">
                        <span class="fact-label">Budget</span>
                        <span class="fact-value">${item.budget ? '$' + item.budget.toLocaleString() : 'N/A'}</span>
                    </div>
                    <div class="fact-item">
                        <span class="fact-label">Revenue</span>
                        <span class="fact-value">${item.revenue ? '$' + item.revenue.toLocaleString() : 'N/A'}</span>
                    </div>
                    ` : `
                    <div class="fact-item">
                        <span class="fact-label">Seasons</span>
                        <span class="fact-value">${item.number_of_seasons || 'N/A'}</span>
                    </div>
                    <div class="fact-item">
                        <span class="fact-label">Episodes</span>
                        <span class="fact-value">${item.number_of_episodes || 'N/A'}</span>
                    </div>
                    `}
                    ${item.production_companies && item.production_companies.length > 0 ? `
                    <div class="fact-item">
                        <span class="fact-label">Production</span>
                        <span class="fact-value">${item.production_companies.map(c => c.name).join(', ')}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${item.videos && item.videos.results.length > 0 ? `
            <div class="details-videos">
                <h3>Videos</h3>
                <div class="videos-container">
                    ${item.videos.results.slice(0, 3).map(video => `
                        <div class="video-item" onclick="playTrailerModal('${video.key}', '${video.name}')">
                            <img src="https://img.youtube.com/vi/${video.key}/mqdefault.jpg" alt="${video.name}">
                            <div class="video-play"><i class="fas fa-play"></i></div>
                            <p>${video.name}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

function playTrailer(id, type) {
    fetch(`${baseUrl}/${type}/${id}/videos?api_key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                // Find the first trailer or teaser
                const trailer = data.results.find(v => v.type === 'Trailer') || 
                               data.results.find(v => v.type === 'Teaser') || 
                               data.results[0];
                playTrailerModal(trailer.key, trailer.name);
            } else {
                showToast('No trailer available for this title');
            }
        })
        .catch(error => {
            console.error('Error fetching trailer:', error);
            showToast('Failed to load trailer');
        });
}

function playTrailerModal(key, title) {
    // Create modal elements
    const modal = document.createElement('div');
    modal.className = 'trailer-modal';
    modal.innerHTML = `
        <div class="trailer-modal-content">
            <div class="trailer-modal-header">
                <h3>${title}</h3>
                <button class="trailer-modal-close" onclick="closeTrailerModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="trailer-modal-body">
                <iframe src="https://www.youtube.com/embed/${key}?autoplay=1" frameborder="0" allowfullscreen></iframe>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
    const modal = document.querySelector('.trailer-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

function displayCast(cast) {
    const slider = document.getElementById('castSlider');
    slider.innerHTML = cast.slice(0, 10).map(person => `
        <div class="slider-item" onclick="viewPersonDetails(${person.id})">
            <div class="cast-card">
                <img src="${person.profile_path ? `${imageBaseUrl}w185${person.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}" alt="${person.name}">
                <h4>${person.name}</h4>
                <p>${person.character || 'Unknown'}</p>
            </div>
        </div>
    `).join('');
}

function displayRecommendations(recommendations, type) {
    const slider = document.getElementById('recommendationsSlider');
    slider.innerHTML = recommendations.slice(0, 10).map(item => `
        <div class="slider-item" onclick="window.location.href='details.html?id=${item.id}&type=${type}'">
            <img src="${item.poster_path ? `${imageBaseUrl}w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Poster'}" alt="${item.title || item.name}">
            <div class="slider-item-overlay">
                <h4>${item.title || item.name}</h4>
                <p>${new Date(item.release_date || item.first_air_date).getFullYear()}</p>
            </div>
        </div>
    `).join('');
}

// ================ PERSON PAGE FUNCTIONS ================

function fetchPersonDetails(personId) {
    fetch(`${baseUrl}/person/${personId}?api_key=${apiKey}&append_to_response=combined_credits,images`)
        .then(response => response.json())
        .then(data => {
            displayPersonDetails(data);
        })
        .catch(error => {
            console.error('Error fetching person details:', error);
            document.getElementById('personHero').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load person details. Please try again later.</p>
                </div>
            `;
        });
}

function displayPersonDetails(person) {
    const hero = document.getElementById('personHero');
    const content = document.getElementById('personContent');
    const knownForSlider = document.getElementById('knownForSlider');
    
    // Hero section with backdrop
    const backdropUrl = person.profile_path 
        ? `${imageBaseUrl}original${person.profile_path}` 
        : 'https://via.placeholder.com/1920x1080?text=No+Image';
    
    hero.innerHTML = `
        <div class="person-hero-backdrop" style="background-image: url('${backdropUrl}')"></div>
        <div class="person-hero-overlay">
            <div class="person-poster">
                <img src="${person.profile_path ? `${imageBaseUrl}w500${person.profile_path}` : 'https://via.placeholder.com/500x750?text=No+Image'}" alt="${person.name}">
            </div>
            <div class="person-hero-content">
                <h1>${person.name}</h1>
                <div class="person-meta" id="personMeta"></div>
            </div>
        </div>
    `;
    
    // Fill meta data
    const meta = document.getElementById('personMeta');
    if (person.birthday) {
        const birthday = document.createElement('div');
        birthday.innerHTML = `<i class="fas fa-birthday-cake"></i> ${new Date(person.birthday).toLocaleDateString()} ${person.deathday ? ` - ${new Date(person.deathday).toLocaleDateString()}` : ''}`;
        meta.appendChild(birthday);
    }
    if (person.place_of_birth) {
        const birthplace = document.createElement('div');
        birthplace.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${person.place_of_birth}`;
        meta.appendChild(birthplace);
    }
    
    // Main content section
    content.innerHTML = `
        <div class="person-info">
            <h2>Biography</h2>
            <p class="person-bio">${person.biography || 'No biography available.'}</p>
            
            <h2>Personal Info</h2>
            <div class="personal-info-grid">
                ${person.known_for_department ? `
                <div class="personal-info-item">
                    <span class="personal-info-label">Known For</span>
                    <span class="personal-info-value">${person.known_for_department}</span>
                </div>
                ` : ''}
                ${person.gender ? `
                <div class="personal-info-item">
                    <span class="personal-info-label">Gender</span>
                    <span class="personal-info-value">${person.gender === 1 ? 'Female' : 'Male'}</span>
                </div>
                ` : ''}
                ${person.popularity ? `
                <div class="personal-info-item">
                    <span class="personal-info-label">Popularity</span>
                    <span class="personal-info-value">${person.popularity.toFixed(1)}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Known For section
    if (person.combined_credits && person.combined_credits.cast) {
        const knownFor = person.combined_credits.cast
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 10);
        
        knownForSlider.innerHTML = knownFor.map(item => `
            <div class="slider-item" onclick="window.location.href='details.html?id=${item.id}&type=${item.media_type}'">
                <img src="${item.poster_path ? `${imageBaseUrl}w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Poster'}" alt="${item.title || item.name}">
                <div class="slider-item-overlay">
                    <h4>${item.title || item.name}</h4>
                    <p>${item.character || ''}</p>
                </div>
            </div>
        `).join('');
    }
}

// ================ MY LIST FUNCTIONS ================

function displayMyList() {
    const container = document.getElementById('myListContainer');
    
    if (myList.length === 0) {
        container.innerHTML = `
            <div class="empty-list">
                <i class="fas fa-list"></i>
                <h3>Your list is empty</h3>
                <p>Add movies and TV shows to your list to watch them later</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="my-list-grid">
                ${myList.map(item => `
                    <div class="my-list-item" onclick="window.location.href='details.html?id=${item.id}&type=${item.type}'">
                        <img src="${item.poster_path ? `${imageBaseUrl}w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Poster'}" alt="${item.title}">
                        <div class="my-list-item-overlay">
                            <button class="btn-remove" onclick="event.stopPropagation(); toggleMyList(${item.id}, '${item.type}')">
                                <i class="fas fa-times"></i> Remove
                            </button>
                            <h4>${item.title}</h4>
                            <p>${item.date ? new Date(item.date).getFullYear() : ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// ================ UTILITY FUNCTIONS ================

function displaySlider(elementId, items, type) {
    const slider = document.getElementById(elementId);
    if (!slider) return;
    
    slider.innerHTML = items.slice(0, 10).map(item => `
        <div class="slider-item">
            <img src="${item.poster_path ? `${imageBaseUrl}w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Poster'}" 
                 alt="${item.title || item.name}" 
                 onclick="window.location.href='details.html?id=${item.id}&type=${type}'">
            <div class="slider-item-overlay">
                <h4>${item.title || item.name}</h4>
                <p>${new Date(item.release_date || item.first_air_date).getFullYear()}</p>
                <div class="slider-item-buttons">
                    <button class="btn-more-info" onclick="event.stopPropagation(); window.location.href='details.html?id=${item.id}&type=${type}'">
                        <i class="fas fa-info-circle"></i> More Info
                    </button>
                    <button class="btn-list" data-id="${item.id}" onclick="event.stopPropagation(); toggleMyList(${item.id}, '${type}')">
                        <i class="fas ${isInMyList(item.id) ? 'fa-check' : 'fa-plus'}"></i> ${isInMyList(item.id) ? 'In List' : 'Add to List'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add view all button if not already present
    const section = slider.closest('.section');
    if (section && !section.querySelector('.view-all-btn')) {
        const header = section.querySelector('h2');
        if (header) {
            const viewAllBtn = document.createElement('button');
            viewAllBtn.className = 'view-all-btn';
            viewAllBtn.textContent = 'View All';
            viewAllBtn.onclick = () => {
                window.location.href = `view-all.html?type=${type}&category=${elementId}`;
            };
            header.insertAdjacentElement('afterend', viewAllBtn);
        }
    }
}

function viewPersonDetails(personId) {
    window.location.href = `person.html?id=${personId}`;
}

// Initialize page based on current URL
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    
    if (path.includes('home.html') || path === '/' || path.includes('index.html')) {
        initHomePage();
    } else if (path.includes('movies.html')) {
        initMoviesPage();
    } else if (path.includes('tv.html')) {
        initTVPage();
    } else if (path.includes('my-list.html')) {
        displayMyList();
    } else if (path.includes('details.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const type = urlParams.get('type');
        if (id && type) {
            fetchDetails(id, type);
        }
    } else if (path.includes('person.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
            fetchPersonDetails(id);
        }
    } else if (path.includes('search.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('query');
        const type = urlParams.get('type') || 'multi';
        if (query) {
            searchContent(query, type);
        } else {
            document.getElementById('searchResults').innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>Enter a search term to find movies and TV shows</h3>
                </div>
            `;
        }
    } else if (path.includes('view-all.html')) {
        loadViewAll();
    }
    
    // Update list buttons on all pages
    updateListButtons();
});