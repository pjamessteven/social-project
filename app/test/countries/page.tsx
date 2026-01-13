import CountryTest from "@/app/components/test/CountryTest";

export default function CountriesTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-white">
            Country Utilities Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Test the country code, name, and flag emoji matching system
          </p>
        </header>

        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
          <h2 className="mb-3 text-2xl font-semibold text-blue-900 dark:text-blue-100">
            About This Test
          </h2>
          <p className="mb-2 text-blue-800 dark:text-blue-200">
            This page demonstrates the country utilities that have been
            implemented to match all country codes with their corresponding
            emojis and country names.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-blue-800 dark:text-blue-200">
            <li>Comprehensive list of 249 countries and territories</li>
            <li>ISO 3166-1 alpha-2 country codes</li>
            <li>Flag emojis for each country</li>
            <li>Special cases for "Local", "Unknown", "EU", and "UN"</li>
            <li>Search functionality by name or code</li>
            <li>Formatting utilities for display</li>
          </ul>
        </div>

        <CountryTest />

        <div className="mt-12 rounded-lg bg-gray-100 p-6 dark:bg-gray-800">
          <h2 className="mb-4 text-2xl font-semibold">Integration Points</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded bg-white p-4 dark:bg-gray-700">
              <h3 className="mb-2 font-semibold">Geolocation Service</h3>
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                The{" "}
                <code className="rounded bg-gray-200 px-1 dark:bg-gray-600">
                  getCountryFromIP
                </code>{" "}
                function returns country codes (e.g., "US") which are then
                formatted for display.
              </p>
              <div className="space-y-1 text-sm">
                <p>• Input: IP address</p>
                <p>• Output: Country code (e.g., "US")</p>
                <p>• Local IPs: Returns null</p>
                <p>• Unknown: Returns null</p>
              </div>
            </div>

            <div className="rounded bg-white p-4 dark:bg-gray-700">
              <h3 className="mb-2 font-semibold">Frontend Components</h3>
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                Country information is displayed in conversation listings:
              </p>
              <div className="space-y-1 text-sm">
                <p>• Featured Conversations component</p>
                <p>• Conversations page</p>
                <p>• Individual conversation views</p>
                <p>• All display formatted country strings</p>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-12 border-t border-gray-200 pt-6 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Country data based on ISO 3166-1 standard. Flag emojis follow
            Unicode standards.
          </p>
        </footer>
      </div>
    </div>
  );
}
