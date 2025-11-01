import Studies from "./studies";

export default async function ParticipatePage() {
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Current Academic Studies</h1>
      <p>
          Your voice matters. Academic researchers are actively studying detransition experiences to improve healthcare and support for individuals like you.
        </p>
        <p className="mb-8">
          By participating in these studies, you can help advance scientific understanding and contribute to better care for future generations. Your experiences are valuable and deserve to be heard.
        </p>

        <div className="not-prose my-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
          <p className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
            Participate in a study for a chance to win a cash prize!
          </p>
        </div>

      <Studies />

      <div className="mt-12 text-center not-prose">
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
          Check back regularly for new opportunities to contribute to research.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Your experiences matter and can help improve care for others going through similar journeys.
        </p>
      </div>
    </div>
  );
}
