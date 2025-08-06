# Vietnamese-English Free-Text Survey Analysis (FreeTxt-Vi)

FreeTxt-Vi extends the Welsh-English FreeTxt toolkit to support bilingual Vietnamese-English survey and questionnaire analysis. It enables the automatic processing, summarisation, and sentiment analysis of civic and service-oriented feedback.

## 🚀 Features

### Core Analysis Features
- **Text Summarization**: Automatic summarization of Vietnamese and English text using advanced NLP models
- **Sentiment Analysis**: Multi-language sentiment analysis with detailed emotion detection
- **Aspect Detection**: Identify and categorize different aspects mentioned in feedback
- **Meaning Analysis**: Deep semantic analysis of text content
- **Concordance Analysis**: Find keyword occurrences with surrounding context
- **Word Suggestions**: Intelligent word suggestions based on context

### Visualization Features
- **Word Cloud Generation**: Visual representation of most frequent words
- **Word Tree Visualization**: Hierarchical word relationship visualization
- **Word Use Relationships**: Analyze how words are used in relation to each other

### Technical Features
- **Bilingual Support**: Full Vietnamese and English language support
- **Real-time Processing**: Fast byte-based processing for quick responses
- **File Upload Support**: Accept various file formats (TXT, PDF, Excel)
- **RESTful API**: Clean API design with comprehensive endpoints
- **Modern Web Interface**: React-based frontend with responsive design

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework
- **D3.js** - Data visualization library
- **Chart.js** - Charting library
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **Python 3.8+** - Core programming language
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation using Python type annotations
- **Loguru** - Advanced logging

### NLP & Machine Learning
- **Transformers** - Hugging Face transformers library
- **PyVnCoreNLP** - Vietnamese NLP toolkit
- **Sentence Transformers** - Sentence embeddings
- **NLTK** - Natural Language Toolkit
- **Scikit-learn** - Machine learning library
- **Torch** - PyTorch for deep learning
- **WordCloud** - Word cloud generation
- **Matplotlib** - Plotting library

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server (in Docker)

## 📋 Prerequisites

### For Docker Deployment
- Docker Engine 20.10+
- Docker Compose 2.0+
- Make (optional, for using Makefile commands)

### For Local Development
- Python 3.8+
- Node.js 20+
- npm or yarn
- Java 8+ (for VnCoreNLP)

## 🐳 Docker Deployment

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Free-txt-vi
   ```

2. **Build and setup all images**
   ```bash
   make setup
   ```

3. **Run the backend API**
   ```bash
   make api-run
   ```

4. **Create environment file for frontend**
   Create a `.env` file in the `web` directory:
   ```bash
   VITE_VERSION=1.0.0
   VITE_BACKEND_URL=http://localhost:53629
   ```

5. **Run the frontend**
   ```bash
   make web-run
   ```

### Alternative Docker Commands

**Build all images:**
```bash
make build-all-images
```

**Run everything together:**
```bash
make run-all
```

**Teardown containers:**
```bash
make teardown
```

### Docker Compose Direct Usage

If you prefer not to use Make:

```bash
# Build images
docker compose -f build/compose/docker-compose.yml build

# Run backend
docker compose -f build/compose/docker-compose.yml run --rm --service-ports api

# Run frontend
docker compose -f build/compose/docker-compose.yml up web
```

## 💻 Local Development

### Backend Setup

1. **Navigate to API directory**
   ```bash
   cd api
   ```

2. **Create Python virtual environment**
   ```bash
   # Using venv
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Or using conda
   conda create -n free-txt-vi python=3.8
   conda activate free-txt-vi

   # Or using uv
   uv venv
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements
   ```

4. **Run the backend server**
   ```bash
   uvicorn runner.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Frontend Setup

1. **Navigate to web directory**
   ```bash
   cd web
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Create environment file**
   Create a `.env` file in the `web` directory:
   ```bash
   VITE_VERSION=1.0.0
   VITE_BACKEND_URL=http://0.0.0.0:8000
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000 (Docker) or http://localhost:5173 (local)
- **Backend API**: http://localhost:53629 (Docker) or http://localhost:8000 (local)
- **API Documentation**: http://localhost:8000/docs (when running locally)

## 📚 API Endpoints

The application provides the following REST API endpoints:

### Analysis Endpoints
- `POST /api/v1/free_txt/aspect_detection` - Detect aspects in text
- `POST /api/v1/free_txt/summarization` - Summarize text content
- `POST /api/v1/free_txt/meaning_analysis` - Analyze text meaning
- `POST /api/v1/free_txt/concordance` - Find keyword concordances
- `POST /api/v1/free_txt/word_suggestions` - Get word suggestions

### Visualization Endpoints
- `POST /api/v1/free_txt/word_cloud` - Generate word cloud
- `POST /api/v1/free_txt/matplotlib_word_cloud` - Generate matplotlib word cloud
- `POST /api/v1/free_txt/word_tree` - Generate word tree visualization
- `POST /api/v1/free_txt/word_use_relationships` - Analyze word relationships

### Sentiment Analysis
- `POST /api/v1/free_txt/sentiment_chart` - Generate sentiment charts

## 🔧 Configuration

### Environment Variables

**Backend (.env in api directory):**
```bash
MODEL_SUM_PATH=/models/qwen2.5-0.5b-instruct
MODEL_SENTIMENT_PATH=/models/multilingual-sentiment-analysis
JVM_PATH=/usr/lib/jvm/default-java/lib/server/libjvm.so
```

**Frontend (.env in web directory):**
```bash
VITE_VERSION=1.0.0
VITE_BACKEND_URL=http://localhost:8000
```

### Port Configuration

- **Frontend**: 3000 (Docker) / 5173 (local dev)
- **Backend**: 53629 (Docker) / 8000 (local dev)

## 📁 Project Structure

```
Free-txt-vi/
├── api/                          # Backend API
│   ├── core/                     # Core settings and configuration
│   ├── internal/                 # Internal application logic
│   │   ├── common/              # Common schemas, enums, exceptions
│   │   ├── controller/          # Business logic controllers
│   │   ├── handler/             # Request handlers
│   │   ├── routes/              # API route definitions
│   │   └── services/            # Core services (NLP, ML)
│   ├── runner/                  # Application entry point
│   └── requirements             # Python dependencies
├── web/                         # Frontend application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API service layer
│   │   └── utils/              # Utility functions
│   └── package.json            # Node.js dependencies
├── build/                       # Docker build files
│   └── compose/                # Docker Compose configuration
└── Makefile                    # Build and deployment commands
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the terms specified in the LICENSE file.

## 🆘 Troubleshooting

### Common Issues

**Docker Issues:**
- Ensure Docker and Docker Compose are properly installed
- Check if ports 3000 and 53629 are available
- Run `docker system prune` if you encounter build issues

**Python Issues:**
- Ensure Python 3.8+ is installed
- Use virtual environment to avoid dependency conflicts
- Install Java 8+ for VnCoreNLP functionality

**Node.js Issues:**
- Ensure Node.js 20+ is installed
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

**API Connection Issues:**
- Verify the backend URL in the frontend `.env` file
- Check if the backend is running on the correct port
- Ensure CORS is properly configured

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Review the API documentation at `/docs` when running locally
- Open an issue on the repository

---

**Note**: This application requires significant computational resources for NLP models. Ensure your system has adequate RAM and CPU for optimal performance.
