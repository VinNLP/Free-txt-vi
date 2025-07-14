import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SentimentAnalysis } from './pages/SentimentAnalysis';
import { Summarization } from './pages/Summarization';
import { WordTree } from './pages/WordTree';
import Concordance from './pages/Concordance';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<SentimentAnalysis />} />
          <Route path="/sentiment" element={<SentimentAnalysis />} />
          <Route path="/summarization" element={<Summarization />} />
          <Route path="/word-tree" element={<WordTree />} />
          <Route path="/concordance" element={<Concordance />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
