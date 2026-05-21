"use client";

interface StudyDescriptionProps {
  description: string;
}

export function StudyDescription({ description }: StudyDescriptionProps) {
  return (
    <div className="border-t text-sm">
      <p>{description}</p>
    </div>
  );
}
