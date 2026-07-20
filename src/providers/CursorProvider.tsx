"use client";

import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function CursorProvider({
  children,
}: Props) {
  return <>{children}</>;
}