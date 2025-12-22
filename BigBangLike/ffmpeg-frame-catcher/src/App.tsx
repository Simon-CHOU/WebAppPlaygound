import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PhotoAlbum from './components/PhotoAlbum';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/album/:albumId" element={<PhotoAlbum />} />
      </Routes>
    </Router>
  );
}

export default App;