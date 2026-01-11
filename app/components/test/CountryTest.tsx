"use client";

import { useState } from "react";
import {
  COUNTRIES,
  SPECIAL_COUNTRIES,
  getCountryByCode,
  formatCountryDisplay,
  formatCountryEmoji,
  formatCountryName,
  searchCountries,
  getAllCountryCodes,
  getAllCountryNames,
} from "@/app/lib/countries";

export default function CountryTest() {
  const [searchQuery, setSearchQuery] = useState("");
  const [testCode, setTestCode] = useState("US");
  const [testName, setTestName] = useState("United States");

  const searchResults = searchCountries(searchQuery);
  const testCountry = getCountryByCode(testCode);
  const testCountryByName = searchCountries(testName)[0];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Country Utilities Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Country Data</h2>
          <p className="mb-2">Total countries: {COUNTRIES.length}</p>
          <p className="mb-4">Special countries: {Object.keys(SPECIAL_COUNTRIES).length}</p>

          <div className="space-y-2">
            <h3 className="font-medium">Special Countries:</h3>
            {Object.entries(SPECIAL_COUNTRIES).map(([code, country]) => (
              <div key={code} className="flex items-center gap-2">
                <span className="text-2xl">{country.emoji}</span>
                <span>{country.name}</span>
                <span className="text-gray-500 text-sm">({code})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Country Lookup</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Country Code:</label>
              <input
                type="text"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                className="w-full p-2 border rounded"
                placeholder="Enter country code (e.g., US, GB, FR)"
              />
              {testCountry && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{testCountry.emoji}</span>
                    <div>
                      <p className="font-medium">{testCountry.name}</p>
                      <p className="text-sm text-gray-500">Code: {testCountry.code}</p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>Formatted display: {formatCountryDisplay(testCode)}</p>
                    <p>Emoji only: {formatCountryEmoji(testCode)}</p>
                    <p>Name only: {formatCountryName(testCode)}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Country Name:</label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter country name"
              />
              {testCountryByName && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{testCountryByName.emoji}</span>
                    <div>
                      <p className="font-medium">{testCountryByName.name}</p>
                      <p className="text-sm text-gray-500">Code: {testCountryByName.code}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Search Countries</h2>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          placeholder="Search by country name or code..."
        />

        {searchQuery && (
          <div>
            <h3 className="font-medium mb-2">
              Results ({searchResults.length}):
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((country) => (
                <div
                  key={country.code}
                  className="p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{country.emoji}</span>
                    <div>
                      <p className="font-medium">{country.name}</p>
                      <p className="text-sm text-gray-500">{country.code}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Sample Countries</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {["US", "GB", "DE", "FR", "JP", "CN", "IN", "BR"].map((code) => {
            const country = getCountryByCode(code);
            return country ? (
              <div
                key={code}
                className="p-4 border rounded text-center hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="text-4xl mb-2">{country.emoji}</div>
                <p className="font-medium">{country.name}</p>
                <p className="text-sm text-gray-500">{country.code}</p>
              </div>
            ) : null;
          })}
        </div>

        <div className="mt-6">
          <h3 className="font-medium mb-2">Utility Functions:</h3>
          <div className="space-y-2 text-sm">
            <p>All country codes: {getAllCountryCodes().slice(0, 10).join(", ")}...</p>
            <p>All country names: {getAllCountryNames().slice(0, 5).join(", ")}...</p>
            <p>Format "US": {formatCountryDisplay("US")}</p>
            <p>Format "GB": {formatCountryDisplay("GB")}</p>
            <p>Format "XX" (invalid): {formatCountryDisplay("XX")}</p>
            <p>Format "Local": {formatCountryDisplay("Local")}</p>
            <p>Format "Unknown": {formatCountryDisplay("Unknown")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
