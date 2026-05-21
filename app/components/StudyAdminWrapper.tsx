"use client";

import { Study } from "@/app/types/study";
import { ReactNode } from "react";

interface StudyAdminWrapperProps {
  study: Study;
  children: ReactNode;
  locale: string;
}

export function StudyAdminWrapper({
  children,
}: StudyAdminWrapperProps) {
  return <>{children}</>;
}
