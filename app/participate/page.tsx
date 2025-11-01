import Studies from "./studies";

export default async function ParticipatePage() {
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Current Academic Studies</h1>
      
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
        <p className="text-lg mb-4 font-medium text-blue-900 dark:text-blue-100">
          Your voice matters. Academic researchers are actively studying detransition experiences to improve healthcare and support for individuals like you.
        </p>
        <p className="text-blue-800 dark:text-blue-200">
          By participating in these studies, you can help advance scientific understanding and contribute to better care for future generations. Your experiences are valuable and deserve to be heard.
        </p>
      </div>

      <Studies />

      <div className="mt-12 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
          More studies coming soon. Check back regularly for new opportunities to contribute to research.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Your experiences matter and can help improve care for others going through similar journeys.
        </p>
      </div>
    </div>
  );
}
