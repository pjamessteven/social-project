import CountryTest from "@/app/components/test/CountryTest";

export default function CountriesTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Country Utilities Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Test the country code, name, and flag emoji matching system
          </p>
        </header>

        <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100 mb-3">
            About This Test
          </h2>
          <p className="text-blue-800 dark:text-blue-200 mb-2">
            This page demonstrates the country utilities that have been implemented to match all country codes with their corresponding emojis and country names.
          </p>
          <ul className="list-disc pl-5 text-blue-800 dark:text-blue-200 space-y-1">
            <li>Comprehensive list of 249 countries and territories</li>
            <li>ISO 3166-1 alpha-2 country codes</li>
            <li>Flag emojis for each country</li>
            <li>Special cases for "Local", "Unknown", "EU", and "UN"</li>
            <li>Search functionality by name or code</li>
            <li>Formatting utilities for display</li>
          </ul>
        </div>

        <CountryTest />

        <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Integration Points</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white dark:bg-gray-700 rounded">
              <h3 className="font-semibold mb-2">Geolocation Service</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                The <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">getCountryFromIP</code> function now returns formatted country strings with emojis.
              </p>
              <div className="text-sm space-y-1">
                <p>• Input: IP address</p>
                <p>• Output: "🇺🇸 United States"</p>
                <p>• Local IPs: "🏠 Local"</p>
                <p>• Unknown: "🌐 Unknown"</p>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-700 rounded">
              <h3 className="font-semibold mb-2">Frontend Components</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Country information is displayed in conversation listings:
              </p>
              <div className="text-sm space-y-1">
                <p>• Featured Conversations component</p>
                <p>• Conversations page</p>
                <p>• Individual conversation views</p>
                <p>• All display formatted country strings</p>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Country data based on ISO 3166-1 standard. Flag emojis follow Unicode standards.
          </p>
        </footer>
      </div>
    </div>
  );
}
