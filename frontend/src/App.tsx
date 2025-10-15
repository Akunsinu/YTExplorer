import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import VideoDetail from './pages/VideoDetail';
import Search from './pages/Search';
import Downloads from './pages/Downloads';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/video/:id" element={<VideoDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/downloads" element={<Downloads />} />
      </Route>
    </Routes>
  );
}

export default App;
