# Contributing to RAI Ops

Thank you for your interest in contributing to the RAI Ops Platform! We welcome contributions from the community to help make AI governance more accessible and robust.

## Getting Started

### Prerequisites

- **Docker & Docker Compose**: Recommended for running the full stack.
- **Python 3.11+**: For backend development.
- **Node.js 16+**: For frontend development.

### Setting Up the Development Environment

1.  **Fork and Clone** the repository:
    ```bash
    git clone https://github.com/your-username/rai-ops.git
    cd rai-ops
    ```

2.  **Backend Setup**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    ```

4.  **Running the App (Docker)**:
    The easiest way to spin up everything (Postgres, Redis, Backend, Frontend) is via Docker:
    ```bash
    docker-compose up --build
    ```

## Project Structure

-   `backend/`: Flask application (API).
    -   `models.py`: SQLAlchemy database models.
    -   `routes/`: API route definitions (Blueprints).
    -   `services.py`: Business logic and core algorithms.
-   `frontend/`: React application (Vite + Tailwind).
    -   `src/pages/`: Main view components.
    -   `src/components/`: Reusable UI components.
    -   `src/context/`: React Context (Auth, Theme).

## Development Workflow

1.  **Create a Branch**:
    ```bash
    git checkout -b feature/amazing-new-feature
    ```

2.  **Make Changes**:
    -   Ensure backend code follows PEP 8.
    -   Ensure frontend code uses TypeScript types where possible.

3.  **Test Your Changes**:
    -   **Backend Tests**:
        ```bash
        cd backend
        pytest
        ```
    -   **Manual Testing**: Verify UI flows in the browser.

4.  **Commit and Push**:
    ```bash
    git add .
    git commit -m "feat: add amazing new feature"
    git push origin feature/amazing-new-feature
    ```

5.  **Open a Pull Request**:
    -   Go to the original repository and click "Compare & pull request".
    -   Describe your changes clearly.
    -   Link to any relevant issues.

## Coding Standards

-   **Python**: Use type hints (`def func(a: int) -> str:`).
-   **React**: Use Functional Components and Hooks.
-   **Styling**: Use Tailwind CSS utility classes. Avoid custom CSS files unless necessary.

## Reporting Issues

If you find a bug or have a feature request, please open an Issue on GitHub using the provided templates.

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

Thank you for building responsibly! 🚀