import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HowToPlayScreen } from './components/screens/HowToPlayScreen.js';
import { LandingScreen } from './components/screens/LandingScreen.js';
import { LobbyScreen } from './components/screens/LobbyScreen.js';
import { GameScreen } from './components/screens/GameScreen.js';
import { GameOverScreen } from './components/screens/GameOverScreen.js';
import { HostScreen } from './components/host/HostScreen.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/how-to-play" replace />} />
        <Route path="/how-to-play" element={<HowToPlayScreen />} />
        <Route path="/join" element={<LandingScreen />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/over" element={<GameOverScreen />} />
        <Route path="/host" element={<HostScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
