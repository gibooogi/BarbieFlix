const API_URL = "/api/tmdb";

const IMAGE_URL = "https://image.tmdb.org/t/p/w500";

const FAVORITES_KEY = "barbieflixFavorites";

// ========================================
// ELEMENTS
// ========================================

const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#search-input");

const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const errorState = document.querySelector("#error-state");

const movieGrid = document.querySelector("#movie-grid");

const favoritesGrid = document.querySelector("#favorites-grid");
const favoritesEmpty = document.querySelector("#favorites-empty");

const yearFilter = document.querySelector("#year-filter");
const sortFilter = document.querySelector("#sort-filter");
const discoverButton = document.querySelector("#discover-button");

const homeLink = document.querySelector("#home-link");
const discoverLink = document.querySelector("#discover-link");
const favoritesLink = document.querySelector("#favorites-link");

// ========================================
// BARBIE MOVIES CACHE
// ========================================

let barbieMoviesCache = null;

// ========================================
// API REQUEST
// ========================================

async function fetchAPI(endpoint) {
    const cleanEndpoint = endpoint.startsWith("/")
        ? endpoint.substring(1)
        : endpoint;

    const [path, queryString] = cleanEndpoint.split("?");

    const url = new URL("/api/tmdb", window.location.origin);

    url.searchParams.set("path", path);

    if (queryString) {
        const params = new URLSearchParams(queryString);

        params.forEach((value, key) => {
            url.searchParams.set(key, value);
        });
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `API Error: ${response.status}`
        );
    }

    return await response.json();
}

// ========================================
// GET ALL BARBIE MOVIES
// ========================================

// TMDB search untuk "Barbie"
// Kemudian hanya mengambil movie yang
// judulnya memang mengandung Barbie.

async function getBarbieMovies() {

    // Gunakan cache supaya tidak request
    // berkali-kali setiap kali search/discover.
    if (barbieMoviesCache) {
        return barbieMoviesCache;
    }

    try {

        // Request halaman pertama
        const firstPage = await fetchAPI(
            `/search/movie?query=Barbie&language=en-US&page=1&include_adult=false`
        );

        let allResults = [
            ...(firstPage.results || [])
        ];

        const totalPages = Math.min(
            firstPage.total_pages || 1,
            20
        );

        // Ambil halaman berikutnya
        if (totalPages > 1) {

            const pageRequests = [];

            for (
                let page = 2;
                page <= totalPages;
                page++
            ) {

                pageRequests.push(
                    fetchAPI(
                        `/search/movie?query=Barbie&language=en-US&page=${page}&include_adult=false`
                    )
                );
            }

            const pages = await Promise.all(
                pageRequests
            );

            pages.forEach(data => {

                if (data.results) {

                    allResults.push(
                        ...data.results
                    );
                }
            });
        }

        // ========================================
        // FILTER AGAR HANYA FILM BARBIE
        // ========================================

        const filteredMovies =
            allResults.filter(movie => {

                const title = (
                    movie.title || ""
                ).toLowerCase();

                const originalTitle = (
                    movie.original_title || ""
                ).toLowerCase();

                // Harus mengandung kata Barbie
                const hasBarbieName =
                    title.includes("barbie") ||
                    originalTitle.includes("barbie");

                // Jangan masukkan adult content
                const isNotAdult =
                    movie.adult !== true;

                // Jangan masukkan video
                const isNotVideo =
                    movie.video !== true;

                return (
                    hasBarbieName &&
                    isNotAdult &&
                    isNotVideo
                );
            });

        // Hapus duplicate berdasarkan movie ID
        const uniqueMovies = [];

        filteredMovies.forEach(movie => {

            const alreadyExists =
                uniqueMovies.some(
                    item =>
                        item.id === movie.id
                );

            if (!alreadyExists) {

                uniqueMovies.push(movie);
            }
        });

        barbieMoviesCache =
            uniqueMovies;

        return barbieMoviesCache;

    } catch (error) {

        console.error(
            "Could not get Barbie movies:",
            error
        );

        throw error;
    }
}

// ========================================
// SORT MOVIES
// ========================================

function sortMovies(movies, sort) {

    const sortedMovies = [...movies];

    sortedMovies.sort((a, b) => {

        switch (sort) {

            case "popularity.desc":

                return (
                    (b.popularity || 0) -
                    (a.popularity || 0)
                );

            case "vote_average.desc":

                return (
                    (b.vote_average || 0) -
                    (a.vote_average || 0)
                );

            case "primary_release_date.desc":

                return (
                    new Date(
                        b.release_date ||
                        "1900-01-01"
                    ) -
                    new Date(
                        a.release_date ||
                        "1900-01-01"
                    )
                );

            case "primary_release_date.asc":

                return (
                    new Date(
                        a.release_date ||
                        "9999-12-31"
                    ) -
                    new Date(
                        b.release_date ||
                        "9999-12-31"
                    )
                );

            default:

                return 0;
        }
    });

    return sortedMovies;
}

// ========================================
// LOAD BARBIE MOVIES
// ========================================

async function loadPopularMovies() {

    showLoading();

    try {

        const barbieMovies =
            await getBarbieMovies();

        const sortedMovies =
            sortMovies(
                barbieMovies,
                "popularity.desc"
            );

        displayMovies(
            sortedMovies
        );

    } catch (error) {

        console.error(
            "Could not load Barbie movies:",
            error
        );

        showError();
    }
}

// ========================================
// SEARCH BARBIE MOVIES
// ========================================

async function searchMovies(keyword) {

    showLoading();

    try {

        const barbieMovies =
            await getBarbieMovies();

        const searchTerm =
            keyword
                .toLowerCase()
                .trim();

        const results =
            barbieMovies.filter(movie => {

                const title =
                    (
                        movie.title ||
                        ""
                    ).toLowerCase();

                const originalTitle =
                    (
                        movie.original_title ||
                        ""
                    ).toLowerCase();

                const overview =
                    (
                        movie.overview ||
                        ""
                    ).toLowerCase();

                return (
                    title.includes(searchTerm) ||
                    originalTitle.includes(searchTerm) ||
                    overview.includes(searchTerm)
                );
            });

        if (
            results.length === 0
        ) {

            showBarbieSearchError();

            return;
        }

        const sortedResults =
            sortMovies(
                results,
                "popularity.desc"
            );

        displayMovies(
            sortedResults
        );

    } catch (error) {

        console.error(
            "Barbie search error:",
            error
        );

        showError();
    }
}

// ========================================
// DISCOVER BARBIE MOVIES
// ========================================

async function discoverMovies() {

    const year =
        yearFilter
            ? yearFilter.value
            : "";

    const sort =
        sortFilter
            ? sortFilter.value
            : "popularity.desc";

    showLoading();

    try {

        const barbieMovies =
            await getBarbieMovies();

        let filteredMovies =
            [...barbieMovies];

        // FILTER YEAR
        if (year) {

            filteredMovies =
                filteredMovies.filter(
                    movie => {

                        return (
                            movie.release_date &&
                            movie.release_date.startsWith(
                                year
                            )
                        );
                    }
                );
        }

        // SORT
        filteredMovies =
            sortMovies(
                filteredMovies,
                sort
            );

        if (
            filteredMovies.length === 0
        ) {

            showBarbieError();

            return;
        }

        displayMovies(
            filteredMovies
        );

        document
            .querySelector(
                ".movie-section"
            )
            .scrollIntoView({
                behavior: "smooth"
            });

    } catch (error) {

        console.error(
            "Barbie Discover Error:",
            error
        );

        showError();
    }
}

// ========================================
// BARBIE SEARCH ERROR
// ========================================

function showBarbieSearchError() {

    emptyState.style.display =
        "none";

    loadingState.style.display =
        "none";

    movieGrid.style.display =
        "none";

    errorState.style.display =
        "block";

    errorState.innerHTML = `
        <h3>
            Barbie movie not found ♡
        </h3>

        <p>
            Try searching for another Barbie movie.
        </p>
    `;
}

// ========================================
// BARBIE DISCOVER ERROR
// ========================================

function showBarbieError() {

    emptyState.style.display =
        "none";

    loadingState.style.display =
        "none";

    movieGrid.style.display =
        "none";

    errorState.style.display =
        "block";

    errorState.innerHTML = `
        <h3>
            No Barbie movie found ♡
        </h3>

        <p>
            Try choosing another year.
        </p>
    `;
}

// ========================================
// DISPLAY MOVIES
// ========================================

function displayMovies(movies) {

    emptyState.style.display =
        "none";

    loadingState.style.display =
        "none";

    errorState.style.display =
        "none";

    movieGrid.style.display =
        "grid";

    movieGrid.innerHTML =
        "";

    movies.forEach(movie => {

        const movieCard =
            createMovieCard(movie);

        movieGrid.appendChild(
            movieCard
        );
    });
}

// ========================================
// CREATE MOVIE CARD
// ========================================

function createMovieCard(movie) {

    const movieCard =
        document.createElement("div");

    movieCard.classList.add(
        "movie-card"
    );

    const poster =
        movie.poster_path
            ? `${IMAGE_URL}${movie.poster_path}`
            : "https://via.placeholder.com/500x750?text=No+Poster";

    const year =
        movie.release_date
            ? movie.release_date.substring(
                0,
                4
            )
            : "Unknown";

    const rating =
        movie.vote_average
            ? movie.vote_average.toFixed(
                1
            )
            : "N/A";

    movieCard.innerHTML = `
        <img
            src="${poster}"
            alt="${movie.title}"
        >

        <div class="movie-info">

            <h3>
                ${movie.title}
            </h3>

            <div class="movie-meta">

                <span>
                    ${year}
                </span>

                <span>
                    ⭐ ${rating}
                </span>

            </div>

        </div>
    `;

    movieCard.addEventListener(
        "click",
        () => {

            openMovieDetails(
                movie.id
            );
        }
    );

    return movieCard;
}

// ========================================
// MOVIE DETAILS
// ========================================

async function openMovieDetails(movieId) {

    try {

        const movie =
            await fetchAPI(
                `/movie/${movieId}?language=en-US`
            );

        const providersData =
            await fetchAPI(
                `/movie/${movieId}/watch/providers`
            );

        showMovieModal(
            movie,
            providersData
        );

    } catch (error) {

        console.error(error);

        alert(
            "Oops! We couldn't load this movie ♡"
        );
    }
}

// ========================================
// MOVIE MODAL
// ========================================

function showMovieModal(
    movie,
    providersData
) {

    const oldModal =
        document.querySelector(
            ".movie-modal"
        );

    if (oldModal) {
        oldModal.remove();
    }

    const poster =
        movie.poster_path
            ? `${IMAGE_URL}${movie.poster_path}`
            : "https://via.placeholder.com/500x750?text=No+Poster";

    const year =
        movie.release_date
            ? movie.release_date.substring(
                0,
                4
            )
            : "N/A";

    const rating =
        movie.vote_average
            ? movie.vote_average.toFixed(
                1
            )
            : "N/A";

    const runtime =
        movie.runtime
            ? `${movie.runtime} min`
            : "N/A";

    const genres =
        movie.genres &&
        movie.genres.length > 0
            ? movie.genres
                .map(
                    genre =>
                        genre.name
                )
                .join(", ")
            : "Genre unavailable";

    const overview =
        movie.overview
            ? movie.overview
            : "No synopsis available.";

    const indonesiaProviders =
        providersData.results?.ID;

    let watchHTML = `
        <p class="no-provider">
            No streaming information
            available for Indonesia ♡
        </p>
    `;

    if (
        indonesiaProviders
    ) {

        const providers = [
            ...(indonesiaProviders.flatrate || []),
            ...(indonesiaProviders.free || []),
            ...(indonesiaProviders.rent || []),
            ...(indonesiaProviders.buy || [])
        ];

        const uniqueProviders = [];

        providers.forEach(
            provider => {

                if (
                    !uniqueProviders.some(
                        item =>
                            item.provider_id ===
                            provider.provider_id
                    )
                ) {

                    uniqueProviders.push(
                        provider
                    );
                }
            }
        );

        if (
            uniqueProviders.length > 0
        ) {

            watchHTML =
                uniqueProviders
                    .map(
                        provider => {

                            const logo =
                                provider.logo_path
                                    ? `${IMAGE_URL}${provider.logo_path}`
                                    : "";

                            return `
                                <a
                                    href="${
                                        indonesiaProviders.link ||
                                        "#"
                                    }"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="provider-card"
                                >

                                    ${
                                        logo
                                            ? `
                                                <img
                                                    src="${logo}"
                                                    alt="${provider.provider_name}"
                                                >
                                            `
                                            : ""
                                    }

                                    <span>
                                        ${provider.provider_name}
                                    </span>

                                </a>
                            `;
                        }
                    )
                    .join("");
        }
    }

    const modal =
        document.createElement("div");

    modal.className =
        "movie-modal";

    modal.innerHTML = `
        <div class="modal-overlay"></div>

        <div class="modal-content">

            <button
                class="modal-close"
            >
                ×
            </button>

            <div class="modal-body">

                <img
                    class="modal-poster"
                    src="${poster}"
                    alt="${movie.title}"
                >

                <div class="modal-info">

                    <p class="section-label">
                        BARBIE MOVIE ♡
                    </p>

                    <h2>
                        ${movie.title}
                    </h2>

                    <div class="modal-meta">

                        <span>
                            📅 ${year}
                        </span>

                        <span>
                            ⭐ ${rating}
                        </span>

                        <span>
                            ⏱ ${runtime}
                        </span>

                    </div>

                    <p class="modal-genres">
                        ${genres}
                    </p>

                    <p class="modal-overview">
                        ${overview}
                    </p>

                    <button
                        class="favorite-button"
                        id="favorite-button"
                    >
                    </button>

                    <div class="watch-section">

                        <h3>
                            Where to Watch ♡
                        </h3>

                        <div class="provider-list">
                            ${watchHTML}
                        </div>

                    </div>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );

    const closeButton =
        modal.querySelector(
            ".modal-close"
        );

    const overlay =
        modal.querySelector(
            ".modal-overlay"
        );

    closeButton.addEventListener(
        "click",
        () => {

            modal.remove();
        }
    );

    overlay.addEventListener(
        "click",
        () => {

            modal.remove();
        }
    );

    function closeWithEscape(
        event
    ) {

        if (
            event.key === "Escape"
        ) {

            modal.remove();

            document.removeEventListener(
                "keydown",
                closeWithEscape
            );
        }
    }

    document.addEventListener(
        "keydown",
        closeWithEscape
    );

    setupFavoriteButton(
        movie
    );
}

// ========================================
// FAVORITES
// ========================================

function getFavorites() {

    const favorites =
        localStorage.getItem(
            FAVORITES_KEY
        );

    if (!favorites) {
        return [];
    }

    try {

        return JSON.parse(
            favorites
        );

    } catch {

        return [];
    }
}

// ========================================
// SAVE FAVORITES
// ========================================

function saveFavorites(
    favorites
) {

    localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(
            favorites
        )
    );
}

// ========================================
// CHECK FAVORITE
// ========================================

function isFavorite(
    movieId
) {

    const favorites =
        getFavorites();

    return favorites.some(
        movie =>
            movie.id === movieId
    );
}

// ========================================
// TOGGLE FAVORITE
// ========================================

function toggleFavorite(
    movie
) {

    let favorites =
        getFavorites();

    if (
        isFavorite(
            movie.id
        )
    ) {

        favorites =
            favorites.filter(
                item =>
                    item.id !== movie.id
            );

    } else {

        favorites.push(
            movie
        );
    }

    saveFavorites(
        favorites
    );

    updateFavoriteButton(
        movie
    );

    renderFavorites();
}

// ========================================
// FAVORITE BUTTON
// ========================================

function setupFavoriteButton(
    movie
) {

    const button =
        document.querySelector(
            "#favorite-button"
        );

    if (!button) {
        return;
    }

    updateFavoriteButton(
        movie
    );

    button.addEventListener(
        "click",
        () => {

            toggleFavorite(
                movie
            );
        }
    );
}

// ========================================
// UPDATE FAVORITE BUTTON
// ========================================

function updateFavoriteButton(
    movie
) {

    const button =
        document.querySelector(
            "#favorite-button"
        );

    if (!button) {
        return;
    }

    if (
        isFavorite(
            movie.id
        )
    ) {

        button.innerHTML =
            "♥ Remove from Favorites";

        button.classList.add(
            "is-favorite"
        );

    } else {

        button.innerHTML =
            "♡ Add to Favorites";

        button.classList.remove(
            "is-favorite"
        );
    }
}

// ========================================
// RENDER FAVORITES
// ========================================

function renderFavorites() {

    if (!favoritesGrid) {
        return;
    }

    const favorites =
        getFavorites();

    favoritesGrid.innerHTML =
        "";

    if (
        favorites.length === 0
    ) {

        favoritesEmpty.style.display =
            "block";

        favoritesGrid.style.display =
            "none";

        return;
    }

    favoritesEmpty.style.display =
        "none";

    favoritesGrid.style.display =
        "grid";

    favorites.forEach(
        movie => {

            const card =
                createMovieCard(
                    movie
                );

            favoritesGrid.appendChild(
                card
            );
        }
    );
}

// ========================================
// LOAD YEARS
// ========================================

function loadYears() {

    if (!yearFilter) {
        return;
    }

    const currentYear =
        new Date().getFullYear();

    for (
        let year = currentYear;
        year >= 1950;
        year--
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            year;

        option.textContent =
            year;

        yearFilter.appendChild(
            option
        );
    }
}

// ========================================
// DISCOVER BUTTON
// ========================================

if (
    discoverButton
) {

    discoverButton.addEventListener(
        "click",
        discoverMovies
    );
}

// ========================================
// SEARCH EVENT
// ========================================

if (
    searchForm
) {

    searchForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const keyword =
                searchInput.value.trim();

            if (!keyword) {

                loadPopularMovies();

                return;
            }

            searchMovies(
                keyword
            );
        }
    );
}

// ========================================
// NAVIGATION - HOME
// ========================================

if (
    homeLink
) {

    homeLink.addEventListener(
        "click",
        event => {

            event.preventDefault();

            document
                .querySelector(
                    "#home"
                )
                .scrollIntoView({
                    behavior: "smooth"
                });
        }
    );
}

// ========================================
// NAVIGATION - DISCOVER
// ========================================

if (
    discoverLink
) {

    discoverLink.addEventListener(
        "click",
        event => {

            event.preventDefault();

            document
                .querySelector(
                    "#discover"
                )
                .scrollIntoView({
                    behavior: "smooth"
                });
        }
    );
}

// ========================================
// NAVIGATION - FAVORITES
// ========================================

if (
    favoritesLink
) {

    favoritesLink.addEventListener(
        "click",
        event => {

            event.preventDefault();

            renderFavorites();

            document
                .querySelector(
                    "#favorites"
                )
                .scrollIntoView({
                    behavior: "smooth"
                });
        }
    );
}

// ========================================
// UI - LOADING
// ========================================

function showLoading() {

    emptyState.style.display =
        "none";

    errorState.style.display =
        "none";

    movieGrid.style.display =
        "none";

    loadingState.style.display =
        "block";
}

// ========================================
// UI - ERROR
// ========================================

function showError() {

    emptyState.style.display =
        "none";

    loadingState.style.display =
        "none";

    movieGrid.style.display =
        "none";

    errorState.style.display =
        "block";

    errorState.innerHTML = `
        <h3>
            Oops! Something went wrong ♡
        </h3>

        <p>
            Please check your TMDB connection.
        </p>
    `;
}

// ========================================
// START APP
// ========================================

loadPopularMovies();

loadYears();

renderFavorites();