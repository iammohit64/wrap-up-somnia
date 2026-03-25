import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from 'react';
import { createPublicClient, webSocket } from 'viem';
import toast from 'react-hot-toast';
import LandingPage from "./pages/LandingPage";
import ResearchLandingPage from "./pages/ResearchLandingPage";
import ResearchReportPage from "./pages/ResearchReportPage";
import AllResearchPage from "./pages/AllResearchPage";
import LegacyLandingPage from "./pages/LegacyLandingPage";
import CuratedArticlesPage from "./pages/CuratedArticlesPage";
import ArticleDetailPage from "./pages/ArticleDetailsPage";
import ComparatorPage from "./pages/ComparatorPage";

// --- SOMNIA REACTIVITY LISTENER ---
// This runs globally and listens to the Somnia WebSocket without user polling
function ReactivityToaster() {
  useEffect(() => {
    const publicClient = createPublicClient({
      // Using Somnia Testnet WebSocket
      transport: webSocket('wss://dream-rpc.somnia.network/ws')
    });

    const unwatch = publicClient.watchContractEvent({
      address: '0x5D03F14c26AE3857bb0A84418Cbdb2225636E9b2', // <-- ADD YOUR AUTO-CLAIMER ADDRESS HERE LATER
      abi: [{ type: 'event', name: 'ReactiveAirdropExecuted', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'tokenAmount', type: 'uint256' }] }],
      eventName: 'ReactiveAirdropExecuted',
      onLogs: (logs) => {
        // Instant Real-Time UI Feedback
        toast.success(
          "⚡ Somnia Reactivity Triggered! WUP Tokens Auto-Airdropped to your wallet. Zero gas paid!", 
          { duration: 6000, style: { border: '1px solid #10b981', background: '#000', color: '#fff' }, icon: '🚀' }
        );
      }
    });

    return () => unwatch(); 
  }, []);

  return null; 
}

function App() {
  return (
    <Router>
      {/* Global WebSocket Listener for Auto-Airdrops */}
      <ReactivityToaster />
      
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#18181b',
            color: '#e5e5e5',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '16px',
          },
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#000' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <div className="min-h-screen bg-black">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/research" element={<ResearchLandingPage />} />
          <Route path="/research/:id" element={<ResearchReportPage />} />
          <Route path="/research-list" element={<AllResearchPage />} />
          <Route path="/compare" element={<ComparatorPage />} />
          <Route path="/legacy" element={<LegacyLandingPage />} />
          <Route path="/curated" element={<CuratedArticlesPage />} />
          <Route path="/curated/:id" element={<ArticleDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;