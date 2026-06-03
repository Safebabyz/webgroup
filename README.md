# EduCenter Project

EduCenter is an educational website template and full-stack Node.js/Express application. It offers a contemporary, modern, and trendy set of features for a majestic web presence with a clean user interface.

## Architecture Overview

The project is structured as a monolithic application containing both a static frontend and a RESTful backend API.

- **Frontend**: A static HTML/JS/CSS client (in `source/` which compiles to `theme/`) using jQuery and various plugins.
- **Backend API**: An Express.js REST API providing authentication, course listings, and booking capabilities.
- **Database**: SQLite database stored locally in the `data/` directory.

### Key Components

- **`src/app.js`**: The main Express server entry point. Sets up middleware, routing, and global error handling.
- **`src/controllers/`**: Handles incoming HTTP requests, validates input, and delegates business logic to services.
- **`src/services/`**: Contains the core business logic and database interactions.
- **`src/routes/`**: Defines the API endpoints and maps them to controllers.
- **`source/`**: The raw source files for the frontend template. Gulp compiles these into the `theme/` folder for production.

## Setup & Installation

Follow these steps to get the project up and running locally.

### Prerequisites
- [Node.js](https://nodejs.org/en/download/) (v16+ recommended)
- Install Gulp CLI globally: `npm install --global gulp-cli`

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root of the project using the provided example:
```bash
cp .env.example .env
```
Ensure the following variables are configured in `.env`:
- `PORT=8000`
- `NODE_ENV=development`
- `JWT_SECRET=your_super_secret_key`
- `JWT_EXPIRES_IN=24h`
- `DB_PATH=./data/database.sqlite`

> **Note**: The application has strict startup checks and will crash if `JWT_SECRET` or `DB_PATH` are missing.

### 3. Run the Development Server
```bash
npm run dev
```
This command concurrently starts the Gulp build process (which watches for frontend changes and runs a live-reload server) and the Node.js API server on port `8000`.

### 4. Production Build
To create a production-ready frontend bundle, run:
```bash
npm run build
```
The compiled files will be output to the `theme/` directory. For production deployment, ensure the API is running with `NODE_ENV=production` for secure error handling.

## Reporting Issues
We use GitHub Issues as the official bug tracker. Please search existing issues before opening a new one.

## License
Released under the [MIT](https://github.com/themefisher/revolve/blob/main/LICENSE) license.
