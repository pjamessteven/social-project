"use client";

import { useState } from "react";

interface Video {
  id: string;
  title: string;
  author: string;
  type: "MTFTM" | "FTMTF";
  url: string;
}

interface VideoFiltersProps {
  videos: Video[];
}

const videos: Video[] = [
  {
    id: "dxlRQAj2iZE",
    title: "Detrans: How I ruined my life",
    author: "Max Wayfarer",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=dxlRQAj2iZE",
  },
  {
    id: "JxLAxhhZwGo",
    title:
      "Why detransitioning after 25 years was the most healing thing I have ever done",
    author: "Call me sam",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=JxLAxhhZwGo",
  },
  {
    id: "tk7NX7iPr9k",
    title: "Doctors Pushed Me Into Surgery",
    author: "Ritchie Herron",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=tk7NX7iPr9k",
  },
  {
    id: "T9UYDyqkH2E",
    title: "My journey of transition and detransition",
    author: "placeswebreath",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=T9UYDyqkH2E",
  },
  {
    id: "8msAX8FyfXs",
    title: "My Penis is gone forever",
    author: "Alexander",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=8msAX8FyfXs",
  },
  {
    id: "GfvJjWlF8Ss",
    title: "I transitioned, here's what happened",
    author: "Maddy Edwards",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=GfvJjWlF8Ss",
  },
  {
    id: "TyX6A4QxKgY",
    title: "The cost of transitioning - my body was never the problem",
    author: "Cat Cattinson",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=TyX6A4QxKgY",
  },
  {
    id: "I5-9YnLP9pY",
    title: "The detransitioned Male Experience",
    author: "Waffling Willow",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=I5-9YnLP9pY",
  },
  {
    id: "CFqyW56P6-g",
    title: "Why I transitioned and detransitioned",
    author: "40daysofrain",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=CFqyW56P6-g",
  },
  {
    id: "zFDQ2OKVZnk",
    title: "Detrans and Back - My Story",
    author: "Max M",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=zFDQ2OKVZnk",
  },
  {
    id: "SaGaONkkEQs",
    title: "Detransitioning and Transhuman Dysphoria",
    author: "Courtney Coulson",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=SaGaONkkEQs",
  },
  {
    id: "H3WyLd1fBrA",
    title: "Detransition & betrayal: my story",
    author: "Laura Becker",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=H3WyLd1fBrA",
  },
  {
    id: "iFYAN_fHYEQ",
    title: "The Tragic Aftermath Of Joining The Trans Cult",
    author: "KC Miller",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=iFYAN_fHYEQ",
  },
  {
    id: "-64oiNs4YSc",
    title: "Think You're Trans? Think Again!",
    author: "Buck Angel and Jade",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=-64oiNs4YSc",
  },
  {
    id: "doaHPFWEa7E",
    title: "De-Transitioner: Here's What Her Doctors Didn't Tell Her",
    author: "Jordan Peterson and Chloe Cole",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=doaHPFWEa7E",
  },
  {
    id: "WtFZaPC3jPk",
    title: "I should never have transitioned",
    author: "Noah",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=WtFZaPC3jPk",
  },
  {
    id: "Fs5e6sOhLsE",
    title: "I was a trans kid so you don't have to be",
    author: "Unknown",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=Fs5e6sOhLsE",
  },
  {
    id: "hBImcJz7-XA",
    title: "The Most Moving Detransition Story I've Ever Heard",
    author: "Jack Jewell Ft. Airiel D Salvatore",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=hBImcJz7-XA",
  },
  {
    id: "rY5Et6FCOrc",
    title: "I Wouldn't Wish Detransition On ANYONE",
    author: "Buck Angel and LaRell",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=rY5Et6FCOrc",
  },
  {
    id: "KXCGi5tbGyk",
    title:
      "My detransition story: the dark truth behind gender dysphoria and regret",
    author: "Alexander L",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=KXCGi5tbGyk",
  },
  {
    id: "mId-jsnjGLM",
    title: "Ex (Detransitioning) Trans Man interview",
    author: "SoftWhiteUnderbelly featuring Laura",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=mId-jsnjGLM",
  },
  {
    id: "DtItMuCW0vI",
    title: "Chloe Cole: 'I'm Still Recovering' From Hormones, Surgery at 15",
    author: "Chloe Cole",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=DtItMuCW0vI",
  },
  {
    id: "efSpVYS8cXU",
    title: "Stunted by Transition | a Detrans Story",
    author: "Kobe",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=efSpVYS8cXU",
  },
  {
    id: "fbwcz8_7exM",
    title: "My detransition story",
    author: "RattleThatAnimation",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=fbwcz8_7exM",
  },
  {
    id: "KBkVhqgRz6U",
    title: "Hysterectomy, Double Mastectomy, and Deep Trans Regret at 24",
    author: "Katie Anderson",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=KBkVhqgRz6U",
  },
  {
    id: "Z2AIAX8-CqQ",
    title: "FtMtF Transition & Detransition Timeline",
    author: "Elle",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=Z2AIAX8-CqQ",
  },
  {
    id: "M0zWaNdkp7Y",
    title: "What the hormones didn't solve",
    author: "Sinead",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=M0zWaNdkp7Y",
  },
  {
    id: "7uJ2fwN32Eg",
    title: "Internalized Misogyny Led to My Transition",
    author: "Waffling Willow",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=7uJ2fwN32Eg",
  },
  {
    id: "QpPc4fexROg",
    title: "Gender transition destroys families",
    author: "Chloe Cole with Luke Healy",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=QpPc4fexROg",
  },
  {
    id: "PqisKeHKPzs",
    title:
      "Detransitioner Interview: Botched Surgery, Regret, & The Social Contagion",
    author: "Shape",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=PqisKeHKPzs",
  },
  {
    id: "QbXyyq1333I",
    title: "I Became Transgender. Here's Why I Regret It.",
    author: "Walt Heyer",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=QbXyyq1333I",
  },
  {
    id: "LnbL74RJoYQ",
    title: "A story of detransition and the journey that followed",
    author: "Calvin Lunt",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=LnbL74RJoYQ",
  },
  {
    id: "Vj3EXt4xiWU",
    title: "Confessions of a Woman Who Lived as a Man (A Detransition Story)",
    author: "Maddie Durbin",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=Vj3EXt4xiWU",
  },
  {
    id: "B9krmEILsNQ",
    title: "Venus Rising with Mary: My Detransition Story",
    author: "Mary",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=B9krmEILsNQ",
  },
  {
    id: "UT7GHTHl61M",
    title: "What Made Detransitioners Know Their Transition Was a Mistake",
    author: "Mary Margaret Olohan and Luka Hein",
    type: "FTMTF",
    url: "https://www.youtube.com/watch?v=UT7GHTHl61M",
  },
  {
    id: "_aGZat6fF1I",
    title: "'I regret trusting' the doctors who pushed me to transition gender",
    author: "Ritchie Herron",
    type: "MTFTM",
    url: "https://www.youtube.com/watch?v=_aGZat6fF1I",
  },
];

export default function VideoFilters() {
  const [filter, setFilter] = useState<"all" | "FTMTF" | "MTFTM">("all");

  const filteredVideos = videos.filter((video) => {
    if (filter === "all") return true;
    return video.type === filter;
  });

  return (
    <>
      <div className="not-prose mt-8 mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            All Stories
          </button>
          <button
            onClick={() => setFilter("FTMTF")}
            className={`rounded px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              filter === "FTMTF"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Female Stories
          </button>
          <button
            onClick={() => setFilter("MTFTM")}
            className={`rounded px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              filter === "MTFTM"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Male Stories
          </button>
        </div>
      </div>

      <div className="not-prose grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredVideos.map((video) => (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            key={video.id}
            className="group block"
          >
            <div className="flex h-full flex-col rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
              <div className="relative mb-3">
                <img
                  src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                  alt={`Thumbnail for ${video.title}`}
                  className="h-48 w-full rounded object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-opacity-50 group-hover:bg-opacity-80 flex h-16 w-16 items-center justify-center rounded-full bg-black/50 transition-all">
                    <svg
                      className="ml-1 h-8 w-8 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col">
                <h3 className="mb-2 text-base font-medium text-blue-600 group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300">
                  {video.title}
                </h3>
                <p className="mt-auto text-sm font-light text-gray-500 dark:text-gray-400">
                  by <b>{video.author}</b> (
                  {video.type === "FTMTF" ? "Female" : "Male"})
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
