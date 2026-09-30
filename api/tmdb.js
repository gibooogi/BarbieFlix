const API_TOKEN = process.env.TMDB_TOKEN;

export default async function handler(req, res) {
    try {
        const path = req.query.path;

        if (!path) {
            return res.status(400).json({
                error: "TMDB path is required"
            });
        }

        const params = new URLSearchParams();

        Object.keys(req.query).forEach(key => {
            if (key !== "path") {
                params.append(key, req.query[key]);
            }
        });

        const queryString = params.toString();

        const tmdbURL =
            `https://api.themoviedb.org/3/${path}` +
            (queryString ? `?${queryString}` : "");

        const response = await fetch(tmdbURL, {
            method: "GET",
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${API_TOKEN}`
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: "TMDB request failed"
            });
        }

        const data = await response.json();

        return res.status(200).json(data);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Server error"
        });
    }
}