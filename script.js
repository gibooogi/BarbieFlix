// Mengambil elemen dari HTML
const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#search-input");
const emptyState = document.querySelector("#empty-state");

// Menjalankan kode ketika user menekan tombol Search
searchForm.addEventListener("submit", function (event) {

    // Mencegah halaman melakukan refresh
    event.preventDefault();

    // Mengambil tulisan yang diketik user
    const searchKeyword = searchInput.value;

    // Menampilkan hasil di console
    console.log("User mencari:", searchKeyword);

    // Mengubah tulisan Empty State
    emptyState.innerHTML = `
        <h3>You searched for "${searchKeyword}" ♡</h3>
        <p>Next, we will use an API to find this movie!</p>
    `;
});