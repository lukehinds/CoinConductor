# CoinConductor 💰

<div align="center">

![CoinConductor Logo](docs/assets/logo.png)

A modern, AI-powered personal finance management system using the Envelope Budgeting methodology.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.0.0-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100.0-teal.svg)](https://fastapi.tiangolo.com/)

</div>

## 🌟 Features

### Core Functionality
- 🔐 **Secure User Management**
  - JWT-based authentication
  - Profile customization
  - Multi-factor authentication support
- 💼 **Envelope Budgeting System**
  - Create custom budget categories
  - Flexible fund allocation
  - Real-time balance tracking
- 📊 **Transaction Management**
  - Manual transaction entry
  - Bank statement imports
  - Recurring transaction support

### Advanced Features
- 🏦 **Bank Integration**
  - SimpleFIN Bridge support
  - GoCardless API integration
  - Secure bank connection management
- 🤖 **AI-Powered Features**
  - Smart transaction categorization
  - Spending pattern analysis
  - Budget recommendations
- 📱 **Modern UI/UX**
  - Responsive design
  - Dark/Light mode
  - Interactive dashboards

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **Authentication**: JWT with HTTP-only cookies

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.8+
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT + OAuth2
- **API Documentation**: OpenAPI (Swagger) + ReDoc

### AI Integration
- OpenAI GPT-4
- Anthropic Claude
- Google Gemini
- Ollama (local models)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- Docker and Docker Compose (optional)
- npm or yarn

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/lukehinds/coinconductor.git
cd coinconductor

# Start all services
docker-compose up -d
```

Visit http://localhost:3000 to access the application.

### Manual Installation

1. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env     # Configure your environment variables
   python run.py
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local  # Configure your environment variables
   npm run dev
   ```

3. **Development Script**
   ```bash
   # From the root directory
   ./run-dev.sh  # Starts both frontend and backend
   ```

## 📚 Documentation

- **API Documentation**: Available at `http://localhost:8000/docs` or `http://localhost:8000/redoc`
- **User Guide**: See [docs/user-guide.md](docs/user-guide.md)
- **Developer Guide**: See [docs/developer-guide.md](docs/developer-guide.md)
- **Architecture**: See [docs/architecture.md](docs/architecture.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to all contributors who have helped shape CoinConductor
- Built with support from the open-source community
- Special thanks to our early adopters and testers

---

<div align="center">
Made with ❤️ by the CoinConductor Team
</div>