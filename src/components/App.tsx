// src/components/App.tsx
"use client";

import { useState } from "react";
import LandingPage from "./LandingPage";
import AppShell from "./AppShell";
import { Mode } from "@/lib/types";

const App = () => {
  const [showApp, setShowApp] = useState(false);
  const [initialMode, setInitialMode] = useState<Mode>("tutor");

  const handleStartLearning = (mode?: Mode) => {
    if (mode) setInitialMode(mode);
    setShowApp(true);
  };

  if (!showApp) {
    return <LandingPage onStart={handleStartLearning} />;
  }

  return <AppShell initialMode={initialMode} />;
};

export default App;
