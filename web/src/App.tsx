import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SentimentAnalysis } from './pages/SentimentAnalysis';
import { Summarization } from './pages/Summarization';
import { WordTree } from './pages/WordTree';
import Concordance from './pages/Concordance';
import { InputTextProvider } from './components/InputTextContext';

function App() {
  return (
    <InputTextProvider>
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
    </InputTextProvider>
  );
}

export default App;
