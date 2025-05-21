import { defineStore } from 'pinia';
import { ref } from 'vue';

interface WeatherData {
  // define structure based on OpenWeatherMap API response
  name?: string;
  main?: {
    temp?: number;
    humidity?: number;
  };
  weather?: {
    description?: string;
    icon?: string;
  }[];
  wind?: {
    speed?: number;
  };
}

interface ForecastData {
  // Define structure for hourly/daily forecast
  list?: {
    dt: number;
    main: {
      temp: number;
    };
    weather: {
      description: string;
      icon: string;
    }[];
  }[];
}

export const useWeatherStore = defineStore('weatherStore', () => {
  const apiKey = ref(process.env.NUXT_PUBLIC_OPENWEATHER_API_KEY);

  if (!apiKey.value) {
    console.error("API Key not found. Please set NUXT_PUBLIC_OPENWEATHER_API_KEY in your .env file.");
  }

  const predefinedCities = [
    { 
        name: 'Rio de Janeiro', 
        lat: -22.9068, 
        lon: -43.1729 
    },
    { 
        name: 'Beijing', 
        lat: 39.9042, 
        lon: 116.4074 
    },
    { 
        name: 'Los Angeles', 
        lat: 34.0522, 
        lon: -118.2437 
    },
  ];

  const selectedCity = ref(predefinedCities[0]);
  const currentWeather = ref<WeatherData | null>(null);
  const hourlyForecast = ref<ForecastData | null>(null);
  const dailyForecast = ref<ForecastData | null>(null); 

  async function fetchCurrentWeather(lat: number, lon: number) {
    if (!apiKey.value) return; 
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey.value}&units=metric`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      currentWeather.value = await response.json();
    } catch (error) {
      console.error("Failed to fetch current weather:", error);
      currentWeather.value = null;
    }
  }

  async function fetchHourlyForecast(lat: number, lon: number) {
    if (!apiKey.value) return; 
    try {
      // using 5 day / 3 hour forecast endpoint, then we can filter for the next few hours.
      const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey.value}&units=metric`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      hourlyForecast.value = await response.json();
    } catch (error) {
      console.error("Failed to fetch hourly forecast:", error);
      hourlyForecast.value = null;
    }
  }

  async function fetchDailyForecast(lat: number, lon: number) {
    if (!apiKey.value) return; 
    try {
      // for simplicity, we'll use the same 5-day/3-hour forecast endpoint
      // and then process it to show a daily summary.

      const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey.value}&units=metric`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      dailyForecast.value = processDailyData(data);
    } catch (error) {
      console.error("Failed to fetch daily forecast:", error);
      dailyForecast.value = null;
    }
  }

  function processDailyData(data: any): ForecastData {
    // simply takes the forecast at noon for each day.
    const daily: any[] = [];
    const seenDays = new Set();
    if (data && data.list) {
      data.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0];
        if (!seenDays.has(day) && date.getHours() >= 12) { 
          daily.push(item);
          seenDays.add(day);
        }
      });
    }
    return { list: daily };
  }


  function selectCity(city: { name: string; lat: number; lon: number }) {
    selectedCity.value = city;
    fetchWeatherData();
  }

  async function fetchWeatherData() {
    if (selectedCity.value) {
      await fetchCurrentWeather(selectedCity.value.lat, selectedCity.value.lon);
      await fetchHourlyForecast(selectedCity.value.lat, selectedCity.value.lon);
      await fetchDailyForecast(selectedCity.value.lat, selectedCity.value.lon);
    }
  }

  return {
    apiKey,
    predefinedCities,
    selectedCity,
    currentWeather,
    hourlyForecast,
    dailyForecast,
    fetchCurrentWeather,
    fetchHourlyForecast,
    fetchDailyForecast,
    selectCity,
    fetchWeatherData,
  };
});