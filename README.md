# CoinConductor - Personal Budget Application

CoinConductor is a personal budget application that uses the Envelope Budgeting methodology to help users manage their finances effectively.

## Features

- **User Accounts**: Create, update, and delete user accounts with secure authentication
- **Envelope Budgeting System**: Divide your balance into customizable categories
- **Transaction Tracking**: Enter transactions manually or import from bank statements
- **Bank Integration**: Connect with banks using SimpleFIN Bridge or GoCardless API
- **AI-Powered Categorization**: Automatically categorize transactions using AI
- **Visual Interface**: Clean, user-friendly interface with responsive design

## Tech Stack

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Python with FastAPI and SQLite
- **Authentication**: JWT-based authentication
- **AI Integration**: Support for OpenAI, Anthropic, Google Gemini, and Ollama

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Set up the backend:
   ```bash
   cd coinconductor/backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up the frontend:
   ```bash
   cd coinconductor/frontend
   npm install
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update the values with your API keys and settings

### Running the Application

1. Start the backend server:
   ```bash
   cd coinconductor/backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python run.py
   ```

2. Start the frontend development server:
   ```bash
   cd coinconductor/frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## API Documentation

Once the backend server is running, you can access the API documentation at `http://localhost:8000/docs` or `http://localhost:8000/redoc`.

## License

This project is licensed under the MIT License - see the LICENSE file for details.