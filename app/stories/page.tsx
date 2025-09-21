export default async function StoriesPage() {
  const videos = [
    {
      id: "dxlRQAj2iZE",
      title: "Detrans: How I ruined my life",
      author: "Max Wayfarer",
      type: "MTFTM",
      url: "https://www.youtube.com/watch?v=dxlRQAj2iZE"
    },
    {
      id: "JxLAxhhZwGo",
      title: "Why detransitioning after 25 years was the most healing thing I have ever done",
      author: "Call me sam",
      type: "MTFTM",
      url: "https://www.youtube.com/watch?v=JxLAxhhZwGo"
    },
    {
      id: "tk7NX7iPr9k",
      title: "Doctors Pushed Me Into Surgery",
      author: "Ritchie Herron",
      type: "MTFTM",
      url: "https://www.youtube.com/watch?v=tk7NX7iPr9k"
    },
    {
      id: "T9UYDyqkH2E",
      title: "My journey of transition and detransition",
      author: "placeswebreath",
      type: "FTMTF",
      url: "https://www.youtube.com/watch?v=T9UYDyqkH2E"
    },
    {
      id: "8msAX8FyfXs",
      title: "My Penis is gone forever",
      author: "Alexander",
      type: "MTFTM",
      url: "https://www.youtube.com/watch?v=8msAX8FyfXs"
    },
    {
      id: "GfvJjWlF8Ss",
      title: "I transitioned, here's what happened",
      author: "Maddy Edwards",
      type: "FTMTF",
      url: "https://www.youtube.com/watch?v=GfvJjWlF8Ss"
    },
    {
      id: "TyX6A4QxKgY",
      title: "The cost of transitioning - my body was never the problem",
      author: "Cat Cattinson",
      type: "FTMTF",
      url: "https://www.youtube.com/watch?v=TyX6A4QxKgY"
    },
    {
      id: "I5-9YnLP9pY",
      title: "The detransitioned Male Experience",
      author: "Waffling Willow",
      type: "MTFTM",
      url: "https://www.youtube.com/watch?v=I5-9YnLP9pY"
    },
    {
      id: "CFqyW56P6-g",
      title: "Why I transitioned and detransitioned",
      author: "40daysofrain",
      type: "MTFTM",
      url: "https://www.youtube.com/watch?v=CFqyW56P6-g"
    },
    {
      id: "zFDQ2OKVZnk",
      title: "Detrans and Back - My Story",
      author: "Max M",
      type: "MTFTM",
      url: "https://www.youtube.com/watch?v=zFDQ2OKVZnk"
    },
    {
      id: "SaGaONkkEQs",
      title: "Detransitioning and Transhuman Dysphoria",
      author: "Courtney Coulson",
      type: "FTMTF",
      url: "https://www.youtube.com/watch?v=SaGaONkkEQs"
    }
  ];

  return (
    <div className="prose prose-sm dark:prose-invert pb-16 lg:pt-8">
      <h1>Personal Transition & Detransition Stories</h1>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Here is a selection of videos and personal memoirs from people who have
        transitioned and then decided to detransition. There are thousands of
        these stories on the internet, this is just a small subset.
      </p>

      <h2>YouTube Videos</h2>

      <div className="grid gap-4 not-prose">
        {videos.map((video) => (
          <div key={video.id} className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex-shrink-0">
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                  alt={`Thumbnail for ${video.title}`}
                  className="w-32 h-24 object-cover rounded"
                />
              </a>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium mb-1">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  {video.title}
                </a>
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
                by [{video.author}] [{video.type}]
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
