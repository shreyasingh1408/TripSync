const axios = require("axios");
const Trip = require("../models/Trip");

const getTripWeather = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const isCreator =
      trip.creator.toString() === req.user._id.toString();

    const isMember = trip.members.some(
      (member) =>
        member.user &&
        member.user.toString() === req.user._id.toString()
    );

    if (!isCreator && !isMember) {
      return res.status(403).json({
        message: "Not authorized to view weather for this trip",
      });
    }

    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    const differenceInMs =
      endDate.getTime() - startDate.getTime();

    const tripDays =
      Math.floor(differenceInMs / (1000 * 60 * 60 * 24)) + 1;

    const forecastDays = Math.min(Math.max(tripDays, 1), 14);

    const response = await axios.get(
      "https://api.weatherapi.com/v1/forecast.json",
      {
        params: {
          key: process.env.WEATHER_API_KEY,
          q: trip.destination,
          days: forecastDays,
          aqi: "no",
          alerts: "yes",
        },
      }
    );

    const weatherData = response.data;

    const forecast = weatherData.forecast.forecastday.map(
      (forecastDay) => ({
        date: forecastDay.date,

        maxTempC: forecastDay.day.maxtemp_c,

        minTempC: forecastDay.day.mintemp_c,

        avgTempC: forecastDay.day.avgtemp_c,

        condition: forecastDay.day.condition.text,

        conditionIcon: forecastDay.day.condition.icon,

        rainChance:
          forecastDay.day.daily_chance_of_rain,

        totalPrecipMm:
          forecastDay.day.totalprecip_mm,

        maxWindKph:
          forecastDay.day.maxwind_kph,

        sunrise:
          forecastDay.astro.sunrise,

        sunset:
          forecastDay.astro.sunset,
      })
    );

    return res.json({
      destination: trip.destination,

      location: {
        name: weatherData.location.name,
        region: weatherData.location.region,
        country: weatherData.location.country,
      },

      forecast,

      alerts:
        weatherData.alerts?.alert || [],
    });
  } catch (error) {
    console.error(
      "Weather API error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Failed to fetch weather",
      error:
        error.response?.data?.error?.message ||
        error.message,
    });
  }
};

module.exports = {
  getTripWeather,
};