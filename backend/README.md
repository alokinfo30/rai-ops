# RAI Ops Backend

Responsible AI Operations platform backend service for monitoring, testing, and managing AI system security and compliance.

## Features

- **User Authentication & Authorization**: Secure JWT-based authentication with role-based access control
- **Red Team Testing**: Comprehensive security testing for AI systems including prompt injection, deepfake detection, and adversarial attacks
- **Model Monitoring**: Real-time drift detection and alerting for model performance metrics
- **Compliance Logging**: Detailed audit trails for all security and compliance activities
- **Scheduled Testing**: Automated security testing with configurable schedules
- **Knowledge Management**: AI-powered knowledge transfer and documentation system

## Architecture

### Core Services

1. **Red Team Attack Service** (`services.py`)
   - Real and simulated attack execution
   - OpenAI integration for realistic security assessments
   - Deterministic simulation for development/testing
   - Comprehensive vulnerability detection

2. **Drift Calculation Service** (`monitoring_routes.py`)
   - Realistic model drift simulation based on time and patterns
   - Configurable model baselines and drift patterns
   - Appropriate alert thresholds per model type
   - Time-based degradation modeling

3. **Authentication Service** (`auth.py`)
   - Secure password validation and storage
   - JWT token management with refresh tokens
   - Rate limiting for security
   - Email-based password reset with development fallbacks

### Database Models

- **User**: User accounts with role-based permissions
- **AITest**: Security test definitions and results
- **ModelDrift**: Model performance monitoring data
- **Alert**: System alerts and notifications
- **ComplianceLog**: Audit trail for compliance
- **ScheduledTest**: Automated test scheduling

## Installation

### Prerequisites

- Python 3.11+
- PostgreSQL (recommended) or SQLite for development
- Redis (optional, for caching)

### Setup

1. Clone the repository
2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Environment configuration:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Initialize database:
   ```bash
   python backend/seed.py
   ```

6. Run the application:
   ```bash
   python backend/app.py
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `PUT /api/auth/profile` - Profile update

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/recent-activity` - Recent activity feed
- `GET /api/dashboard/vulnerability-trend` - Vulnerability trends
- `GET /api/dashboard/chart-data` - Chart data for visualization

### Red Teaming
- `POST /api/redteam/test` - Create new test
- `POST /api/redteam/test/{id}/run` - Execute test
- `GET /api/redteam/test/{id}` - Get test results
- `GET /api/redteam/test` - List user tests

### Monitoring
- `POST /api/monitoring/generate` - Generate monitoring data
- `GET /api/monitoring/drift` - Get drift metrics
- `POST /api/monitoring/alerts/{id}/resolve` - Resolve alert
- `GET /api/monitoring/compliance-logs` - Get compliance logs

### Reports
- `GET /api/reports/compliance/pdf` - Generate compliance report
- `POST /api/reports/compliance/email` - Email compliance report

## Security Features

### Authentication & Authorization
- JWT tokens with configurable expiration
- Password strength validation (8+ chars, uppercase, numbers)
- Rate limiting on authentication endpoints
- Secure password hashing with Werkzeug

### Data Protection
- Input validation and sanitization
- SQL injection protection via SQLAlchemy ORM
- XSS protection through proper escaping
- Secure session management

### Compliance
- Comprehensive audit logging
- Data retention policies
- Role-based access control
- Secure API endpoints with authentication

## Development

### Code Quality
- Type hints throughout the codebase
- Comprehensive error handling
- Logging for debugging and monitoring
- Unit tests with pytest

### Testing
```bash
# Run all tests
pytest

# Run specific test file
pytest backend/test_auth.py

# Run with coverage
pytest --cov=backend
```

### Docker Deployment
```bash
# Build image
docker build -t rai-ops-backend .

# Run container
docker run -p 5000:5000 rai-ops-backend
```

## Configuration

### Environment Variables

- `SECRET_KEY`: Flask secret key
- `JWT_SECRET_KEY`: JWT signing key
- `DATABASE_URL`: Database connection string
- `REDIS_URL`: Redis connection (optional)
- `OPENAI_API_KEY`: OpenAI API key for real attacks
- `FRONTEND_URL`: Frontend application URL

### Development vs Production

The application automatically adjusts behavior based on environment:
- Development: Simulation mode, detailed logging, mock email fallbacks
- Production: Real API calls, optimized performance, secure logging

## Monitoring & Logging

### Application Logs
- Structured logging with appropriate levels
- Security event logging for compliance
- Performance monitoring for optimization

### Health Checks
- `/api/health` - Application health endpoint
- Database connectivity checks
- External service availability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure code quality with linting
5. Submit a pull request

## License

[Add your license information here]

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team