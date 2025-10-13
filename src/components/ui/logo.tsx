"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

interface LogoProps {
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  priority?: boolean;
}

export function Logo({
  width = 32,
  height = 32,
  alt = "Sixtyfour",
  className = "",
  priority = false,
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during hydration to avoid layout shift
    return <div className={`${className}`} style={{ width, height }} />;
  }

  // Determine which logo to use based on the resolved theme
  const logoSrc =
    resolvedTheme === "dark"
      ? "/logo_transparent_white.png"
      : "/logo_transparent_black.png";

  return (
    <Image
      src={logoSrc}
      alt={alt}
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority={priority}
    />
  );
}

