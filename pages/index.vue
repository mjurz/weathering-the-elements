<template>
  <div class="weather-app">
    <div class="tabs">
      <button
        v-for="city in weatherStore.predefinedCities"
        :key="city.name"
        @click="weatherStore.selectCity(city)"
        :class="{ active: weatherStore.selectedCity.name === city.name }"
      >
        {{ city.name }}
      </button>
    </div>

    <div v-if="weatherStore.selectedCity && weatherStore.currentWeather" class="weather-details">
      <h2>{{ weatherStore.selectedCity.name }}</h2>
      <button @click="refreshData">Refresh</button>

      <div v-if="weatherStore.currentWeather" class="current-weather">
        <h3>Current Weather</h3>
        <p>Temperature: {{ weatherStore.currentWeather.main?.temp }}°C</p>
        <p>Condition: {{ weatherStore.currentWeather.weather?.[0]?.description }}</p>
        <img :src="getWeatherIconUrl(weatherStore.currentWeather.weather?.[0]?.icon)" alt="Weather icon">
        <p>Humidity: {{ weatherStore.currentWeather.main?.humidity }}%</p>
        <p>Wind: {{ weatherStore.currentWeather.wind?.speed }} m/s</p>
      </div>

      <div v-if="weatherStore.hourlyForecast && weatherStore.hourlyForecast.list" class="hourly-forecast">
        <h3>Next Hours</h3>
        <div class="forecast-items">
          <div v-for="hour in getNextHoursForecast(weatherStore.hourlyForecast.list)" :key="hour.dt" class="forecast-item">
            <p>{{ new Date(hour.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</p>
            <img :src="getWeatherIconUrl(hour.weather[0].icon)" alt="Weather icon">
            <p>{{ hour.main.temp }}°C</p>
          </div>
        </div>
      </div>

      <div v-if="weatherStore.dailyForecast && weatherStore.dailyForecast.list" class="daily-forecast">
        <h3>Next Days</h3>
        <div class="forecast-items">
          <div v-for="day in weatherStore.dailyForecast.list" :key="day.dt" class="forecast-item">
            <p>{{ new Date(day.dt * 1000).toLocaleDateString([], { weekday: 'short', day: 'numeric' }) }}</p>
            <img :src="getWeatherIconUrl(day.weather[0].icon)" alt="Weather icon">
            <p>{{ day.main.temp }}°C</p>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="!weatherStore.currentWeather && weatherStore.selectedCity">
        <p>Loading weather data for {{ weatherStore.selectedCity.name }}...</p>
    </div>

    <div class="city-search">
        <input type="text" v-model="searchQuery" placeholder="Search for a city">
        <button @click="searchCity">Search</button>
        <div v-if="searchResults.length > 0">
            <h4>Search Results:</h4>
            <ul>
                <li v-for="city in searchResults" :key="city.id" @click="selectSearchedCity(city)">
                    {{ city.name }}, {{ city.country }}
                </li>
            </ul>
        </div>
         <div v-if="searchError">
            <p>{{ searchError }}</p>
        </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useWeatherStore } from '~/stores/weatherStore';

const weatherStore = useWeatherStore();
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const searchError = ref<string | null>(null);

const getWeatherIconUrl = (iconCode: string | undefined) => {
  return iconCode ? `https://openweathermap.org/img/wn/${iconCode}@2x.png` : '';
};

const refreshData = () => {
  if (weatherStore.selectedCity) {
    weatherStore.fetchWeatherData();
  }
};

const getNextHoursForecast = (hourlyList: any[] | undefined) => {
  if (!hourlyList) return [];
  return hourlyList.slice(0, 5); // show next 5 available 3-hour forecasts
};

async function searchCity() {
    if (!searchQuery.value.trim()) {
        searchError.value = "Please enter a city name.";
        searchResults.value = [];
        return;
    }
    searchError.value = null;
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${searchQuery.value}&appid=${weatherStore.apiKey}&units=metric`);
        if (!response.ok) {
            if (response.status === 404) {
                searchError.value = `City "${searchQuery.value}" not found.`;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.coord) {

            searchResults.value = [{
                name: data.name,
                lat: data.coord.lat,
                lon: data.coord.lon,
                country: data.sys?.country
            }];
        } else {
            searchResults.value = [];
            searchError.value = `No coordinates found for "${searchQuery.value}".`;
        }
    } catch (error: any) {
        console.error("Failed to search city:", error);
        searchResults.value = [];
        if (!searchError.value) {
            searchError.value = error.message || "Failed to search city. Please try again.";
        }
    }
}

function selectSearchedCity(city: { name: string; lat: number; lon: number; country?: string }) {
    weatherStore.selectCity({ name: city.name, lat: city.lat, lon: city.lon });
    searchResults.value = []; // clear search results after selection
    searchQuery.value = ''; // clear search input
}


onMounted(() => {
  // fetch data for the default selected city when the component mounts
  if (weatherStore.predefinedCities.length > 0) {
    weatherStore.selectCity(weatherStore.predefinedCities[0]);
  }
});

</script>

<style scoped>
.weather-app {
  font-family: sans-serif;
  padding: 20px;
  max-width: 700px;
  margin: auto;
  background-color: #f4f4f4;
  border-radius: 8px;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #ccc;
}

.tabs button {
  padding: 10px 15px;
  border: none;
  background-color: transparent;
  cursor: pointer;
  font-size: 16px;
  margin-right: 5px;
  border-bottom: 3px solid transparent;
}

.tabs button.active {
  border-bottom: 3px solid #007bff;
  font-weight: bold;
}

.tabs button:hover {
  background-color: #e9e9e9;
}

.weather-details h2 {
  margin-top: 0;
  color: #333;
}

.weather-details > button {
    padding: 8px 15px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-bottom: 20px;
}

.weather-details > button:hover {
    background-color: #0056b3;
}

.current-weather,
.hourly-forecast,
.daily-forecast {
  background-color: #fff;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.current-weather h3,
.hourly-forecast h3,
.daily-forecast h3 {
  margin-top: 0;
  color: #007bff;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 10px;
}

.current-weather p,
.forecast-item p {
  margin: 5px 0;
  font-size: 15px;
}

.current-weather img {
    vertical-align: middle;
}

.forecast-items {
  display: flex;
  overflow-x: auto; 
}

.forecast-item {
  min-width: 100px;
  text-align: center;
  margin-right: 15px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #eee;
}

.forecast-item img {
  width: 50px;
  height: 50px;
}

.city-search {
    margin-top: 30px;
    padding: 15px;
    background-color: #fff;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.city-search input[type="text"] {
    padding: 8px;
    margin-right: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
}

.city-search button {
    padding: 8px 15px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.city-search button:hover {
    background-color: #218838;
}

.city-search ul {
    list-style-type: none;
    padding: 0;
    margin-top: 10px;
}

.city-search li {
    padding: 8px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
}

.city-search li:hover {
    background-color: #f0f0f0;
}

.city-search li:last-child {
    border-bottom: none;
}

</style>