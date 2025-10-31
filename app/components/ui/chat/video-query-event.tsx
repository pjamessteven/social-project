"use client";

import { usePart } from "@llamaindex/chat-ui";
import { Loader2 } from "lucide-react";

import { memo, useMemo } from "react";
import YouTube from "react-youtube";

type EventPart = {
  id?: string | undefined;
  type: "data-event";
  data: {
    title: string;
    query: string;
    result: any;
    status: string;
  };
};

interface VideoMetadata {
  sectionSummary: string;
  title: string;
  author: string;
  startTime: number;
  endTime: number;
  url: string;
  sex: string;
  created: number;
  link: string;
  id: string;
}

interface VideoNode {
  text: string;
  metadata: VideoMetadata;
}

interface VideoResultItem {
  node: VideoNode;
}

interface VideoData {
  text: string;
  summary: string;
  title: string;
  author: string;
  startTime: number;
  endTime: number;
  url: string;
  sex: string;
  created: number;
  link: string;
  id: string;
}

interface VideoComponentProps {
  video: VideoData;
  isFirst: boolean;
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  // Format using the user's locale (e.g., 1:05 → "1:05" or localized digits)
  const formatted = new Intl.NumberFormat(undefined, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(remainingSeconds);

  return `${minutes}:${formatted}`;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

const VideoComponent = memo(function VideoComponent({
  video,
  isFirst,
}: VideoComponentProps) {
  const videoId = extractYouTubeVideoId(video.url);

  return (
    <div className="not-prose mb-6 rounded-lg border">
      {videoId ? (
        <YouTube
          videoId={videoId}
          opts={{
            height: "270",
            width: "480",
            playerVars: {
              autoplay: isFirst ? 1 : 0,
              mute: isFirst ? 1 : 0,
              start: Math.floor(video.startTime),
            },
          }}
        />
      ) : (
        <div className="p-4 text-center text-gray-500">Invalid YouTube URL</div>
      )}
      {/*
      <ReactPlayer
        key={`${video.url}#t=${Math.floor(video.startTime)}`}
        src={getVideoUrl(video.url, video.startTime)}
        autoPlay={isFirst}
        muted={isFirst}
        controls
        width="100%"
        height="315px"
        config={{
          youtube: {
            color: "white",
          },
        }}
      />
 */}
      {video.summary && (
        <div className="p-3">
          <p className="text-sm text-gray-600">
            [{formatSeconds(video.startTime)}] {video.summary}
          </p>
        </div>
      )}
    </div>
  );
});

export default function VideoQueryEventPart() {
  // usePart returns data only if current part matches the type
  const eventPart = usePart<EventPart>("data-video-query-event");

  // Memoize the parsed results to prevent unnecessary re-parsing
  const results = useMemo(() => {
    if (!eventPart?.data?.result) return [];
    try {
      const result: VideoResultItem[] = JSON.parse(eventPart.data.result);
      return result.map((item) => ({
        text: item.node.text,
        summary: item.node.metadata.sectionSummary,
        title: item.node.metadata.title,
        author: item.node.metadata.author,
        startTime: item.node.metadata.startTime,
        endTime: item.node.metadata.endTime,
        url: item.node.metadata.url,
        sex: item.node.metadata.sex,
        created: Number(item.node.metadata.created) * 1000, // unix time to ms
        link: item.node.metadata.link,
        id: item.node.metadata.id,
      }));
    } catch (error) {
      console.error("Error parsing video data:", error);
      return [];
    }
  }, [eventPart?.data?.result]);

  if (!eventPart) return null;

  const isLoading = eventPart.data.title === "Querying videos...";

  return (
    <div className="-mt-8 space-y-4 max-w-[calc(100vw-16px)]">
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Video Archive Query: {eventPart.data.query}
        </p>
      </div>

      {results.length > 0 ? (
        <div className="flex flex-row gap-4 space-y-6 overflow-x-auto">
          {results.map((video, index) => (
            <VideoComponent
              key={video.id || index}
              video={video}
              isFirst={index === 0}
            />
          ))}
        </div>
      ) : (
        <div className=" text-center">
          {isLoading ? (
            <p>
              <div className="flex items-center">
                <div>Searching the video archive...</div>{" "}
                <Loader2 className="ml-2 h-4 w-4 animate-spin text-blue-500 dark:text-blue-100" />
              </div>
            </p>
          ) : (
            <p className="text-gray-500">No videos found</p>
          )}
        </div>
      )}
    </div>
  );
}
