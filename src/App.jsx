import { useEffect, useState } from "react";
import "./style.css";

const API_BASE = "https://worldtimeweather.com/api/v1";

function App() {
  const [city, setCity] = useState("");
  const [cities, setCities] = useState([]);
  const [weather, setWeather] = useState(null);
  const [unit, setUnit] = useState("C");
  const [recentCities, setRecentCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load supported cities from the documented API.
  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await fetch(`${API_BASE}/cities.json`);

        if (!response.ok) {
          throw new Error("Could not load the city list.");
        }

        const data = await response.json();
        setCities(data.data || []);
      } catch {
        setError("Unable to load cities. Please refresh the page.");
      }
    };

    loadCities();
  }, []);

  const convertTemp = (tempC, tempF) => {
    if (unit === "F") {
      return Math.round(tempF ?? (tempC * 9) / 5 + 32);
    }

    return Math.round(tempC);
  };

  const formatCondition = (condition = "unknown") =>
    condition
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const handleSearch = async (search = city) => {
    const query = search.trim();

    if (!query) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // This API has no arbitrary city-search endpoint.
      // Find the city in its supported city index first.
      const normalizedQuery = query.toLowerCase();

      const matchedCity =
        cities.find(
          (item) =>
            item.name.toLowerCase() === normalizedQuery ||
            item.slug.toLowerCase() === normalizedQuery
        ) ||
        cities.find(
          (item) =>
            item.name.toLowerCase().startsWith(normalizedQuery) ||
            item.slug.toLowerCase().startsWith(normalizedQuery)
        );

      if (!matchedCity) {
        throw new Error(
          "City not found in the supported list. Try another city name."
        );
      }

      const response = await fetch(
        `${API_BASE}/city/${encodeURIComponent(matchedCity.slug)}.json`
      );

      if (!response.ok) {
        throw new Error("Unable to fetch weather for this city.");
      }

      const data = await response.json();

      if (!data.weather || !data.time) {
        throw new Error("Weather data is unavailable for this city.");
      }

      setWeather(data);

      setRecentCities((previous) => [
        {
          name: data.name,
          slug: data.slug,
          country_code: data.country_code,
        },
        ...previous.filter((item) => item.slug !== data.slug),
      ].slice(0, 5));

      setCity("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const currentWeather = weather?.weather;

  return (
    <div
      className={`app ${
        currentWeather?.condition || ""
      }`}
    >
      <h1>Weather Dashboard</h1>
      <p>Welcome to my weather app</p>

      <div className="search-box">
        <input
          type="text"
          placeholder="Enter a supported city name"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          disabled={loading}
        />

        <button onClick={() => handleSearch()} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>

        <button
          onClick={() => setUnit((previous) =>
            previous === "C" ? "F" : "C"
          )}
          aria-label="Toggle temperature unit"
        >
          Show °{unit === "C" ? "F" : "C"}
        </button>
      </div>

      {loading && (
        <p className="loading-message">Loading weather...</p>
      )}

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {weather && currentWeather && (
        <div className="weather-card">
          <h2>
            {weather.name}, {weather.country_code}
          </h2>

          <p>
            Local time:{" "}
            {new Date().toLocaleTimeString("en-IN", {
              timeZone: weather.time.timezone,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>

          <p>Time zone: {weather.time.timezone}</p>
          <p>UTC offset: {weather.time.utc_offset}</p>

          <h3>
            {convertTemp(
              currentWeather.temperature_c,
              currentWeather.temperature_f
            )}
            °{unit}
          </h3>

          <p>{formatCondition(currentWeather.condition)}</p>

          <p>
            Feels Like:{" "}
            {convertTemp(
              currentWeather.feels_like_c,
              (currentWeather.feels_like_c * 9) / 5 + 32
            )}
            °{unit}
          </p>

          <p>
            Humidity: {currentWeather.humidity_percent}%
          </p>

          <p>
            Wind Speed:{" "}
            {unit === "F"
              ? currentWeather.wind_speed_mph
              : currentWeather.wind_speed_kmh}{" "}
            {unit === "F" ? "mph" : "km/h"}
          </p>

          <p>
            Observed at:{" "}
            {currentWeather.observed_at
              ? new Date(currentWeather.observed_at).toLocaleString(
                  "en-IN",
                  { timeZone: weather.time.timezone }
                )
              : "Not available"}
          </p>

          {currentWeather.stale && (
            <p className="error-message">
              Weather observation may be outdated.
            </p>
          )}
        </div>
      )}

      {recentCities.length > 0 && (
        <div className="recent-cities">
          <h2>Recent Cities</h2>

          {recentCities.map((recentCity) => (
            <button
              key={recentCity.slug}
              onClick={() => handleSearch(recentCity.slug)}
              disabled={loading}
            >
              {recentCity.name}
            </button>
          ))}
        </div>
      )}

      <p className="attribution">
        Weather data by{" "}
        <a
          href="https://worldtimeweather.com/"
          target="_blank"
          rel="noreferrer"
        >
          World Time &amp; Weather
        </a>{" "}
        and Open-Meteo.
      </p>
    </div>
  );
}

export default App;