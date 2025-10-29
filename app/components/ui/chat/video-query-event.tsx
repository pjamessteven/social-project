"use client";

import { usePart } from "@llamaindex/chat-ui";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import ReactPlayer from "react-player/youtube";
import CommentCard from "../../CommentCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion";

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

function VideoComponent({ video, isFirst }: VideoComponentProps) {
  return (
    <div className="mb-6 rounded-lg border p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold">{video.title}</h3>
        <p className="text-sm text-gray-600">by {video.author}</p>
      </div>
      
      <div className="mb-3">
        <ReactPlayer
          url={video.url}
          playing={isFirst}
          muted={isFirst}
          controls
          width="100%"
          height="315px"
          config={{
            youtube: {
              playerVars: { 
                start: Math.floor(video.startTime)
              }
            }
          }}
        />
      </div>
      
      {video.summary && (
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-700">Summary:</p>
          <p className="text-sm text-gray-600">{video.summary}</p>
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        <p>Start: {Math.floor(video.startTime)}s | End: {Math.floor(video.endTime)}s</p>
        <p>Created: {new Date(video.created).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

export default function VideoQueryEventPart() {
  // usePart returns data only if current part matches the type
  const videoPart = usePart<EventPart>("data-video-query-event");

  // Memoize the parsed results to prevent unnecessary re-parsing
  const results = useMemo(() => {
    if (!videoPart?.data?.result) return [];
    try {
      const result: VideoResultItem[] = JSON.parse(videoPart.data.result);
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
  }, [videoPart?.data?.result]);

  if (!videoPart) return null;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold">{videoPart.data.title}</h2>
        <p className="text-sm text-gray-600">Query: {videoPart.data.query}</p>
      </div>
      
      {results.length > 0 ? (
        <div className="space-y-6">
          {results.map((video, index) => (
            <VideoComponent 
              key={video.id || index} 
              video={video} 
              isFirst={index === 0}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No videos found</p>
        </div>
      )}
    </div>
  );
}
