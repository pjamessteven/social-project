import { Card } from "../ui/card";

export default function RedditEmbed({
  title,
  user,
  userUrl,
  sub,
  subUrl,
  url,
  imageUrl,
}: {
  title: string;
  user: string;
  sub: string;
  subUrl: string;
  url: string;
  userUrl: string;
  imageUrl?: string;
}) {
  return (
    // The Card provides the border, background, and now padding.
    // Your "border-destructive" class is kept for the specific highlight effect.
    <Card
      className={
        "border-destructive reddit-card min-w-md border transition-all duration-300"
      }
    >
      <blockquote
        className="reddit-embed-bq" // This class is ESSENTIAL for the script to find it
        data-embed-height="600"
        data-embed-parent="true"
      >
        {/* Title Section */}
        <div className="m-4 mb-2 text-lg leading-snug font-semibold md:text-xl">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-card-foreground hover:text-primary hover:underline"
          >
            {title}
          </a>
        </div>

        {/* Meta Information Section */}
        <div className="text-muted-foreground m-4 text-sm">
          Posted by{" "}
          <a
            href={userUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-card-foreground hover:text-primary font-medium hover:underline"
          >
            {user}
          </a>{" "}
          in{" "}
          <a
            href={subUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-card-foreground hover:text-primary font-medium hover:underline"
          >
            r/{sub}
          </a>
        </div>
      </blockquote>
    </Card>
  );
}
