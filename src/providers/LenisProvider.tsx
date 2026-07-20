"use client";

import { ReactNode } from "react";
import { useLenis } from "../hooks";

interface Props {
  children: ReactNode;
}

export default function LenisProvider({
  children,
}: Props) {
  useLenis();

  return <>{children}</>;
}