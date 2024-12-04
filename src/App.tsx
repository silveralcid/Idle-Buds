import React, { useEffect } from "react";
import { useViewStore } from "./core/view.store";
import GameContainer from "./views/GameContainer";
import MiningView from "./views/MiningView";
import Sidebar from "./core/components/Sidebar";
import { ResumeModal } from "./core/components/ResumeModal";
import { VisibilityHandler } from "./core/components/VisibilityHandler";
import { initializeGame } from "./utils/initialize-game";

function App() {
  const currentView = useViewStore((state) => state.currentView);

  useEffect(() => {
    const cleanup = initializeGame();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const renderView = () => {
    switch (currentView) {
      case "MiningView":
        return <MiningView />;
      default:
        return <div>No view found.</div>;
    }
  };

  return (
    <>
      <ResumeModal />
      <VisibilityHandler />
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-4 bg-base-300">
          <GameContainer>{renderView()}</GameContainer>
        </main>
      </div>
    </>
  );
}

export default App;
