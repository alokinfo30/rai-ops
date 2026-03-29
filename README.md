# RAI Ops Application

A comprehensive Risk Assessment and Intelligence Operations platform for AI systems.

## Features

- **User Authentication**: Secure JWT-based authentication with email verification
- **AI Risk Assessment**: Comprehensive risk evaluation and monitoring
- **Red Teaming**: Security testing and vulnerability assessment
- **Knowledge Management**: AI model documentation and compliance tracking
- **Real-time Monitoring**: Continuous system health and performance monitoring
- **Reporting**: Detailed compliance and security reports
- **Notifications**: Email alerts and system notifications

## Environment Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (for production)
- Redis (for caching and rate limiting)

### Development Environment

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd rai-ops
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development environment:**
   ```bash
   python start_dev.py
   ```
   
   This will:
   - Install Python and Node.js dependencies
   - Start the backend Flask server on http://localhost:5000
   - Start the frontend Vite server on http://localhost:5173
   - Set up development-specific configurations

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/health

### Production Environment

1. **Set up environment variables:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Using Docker (Recommended):**
   ```bash
   # Build and start all services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   
   # Stop services
   docker-compose down
   ```

3. **Manual deployment:**
   ```bash
   # Install dependencies
   python -m pip install -r backend/requirements.txt
   
   # Set environment variables
   export FLASK_ENV=production
   export DATABASE_URL=postgresql://user:password@localhost/rai_ops_prod
   
   # Run migrations
   python backend/migrations.py
   
   # Start production server
   python start_prod.py
   ```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SECRET_KEY` | Flask secret key | dev-secret-key | Yes (Prod) |
| `JWT_SECRET_KEY` | JWT signing key | dev-jwt-secret | Yes (Prod) |
| `DATABASE_URL` | Database connection string | sqlite:///rai_ops.db | No |
| `MAIL_USERNAME` | SMTP username | - | Yes (Prod) |
| `MAIL_PASSWORD` | SMTP password | - | Yes (Prod) |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes |
| `REDIS_URL` | Redis connection string | redis://localhost:6379/0 | No |

### Development vs Production

#### Development Configuration
- SQLite database
- Debug mode enabled
- Relaxed CORS settings
- In-memory rate limiting
- Debug logging
- Email suppression

#### Production Configuration
- PostgreSQL database (required)
- Debug mode disabled
- Strict CORS settings
- Redis-based rate limiting
- Info-level logging
- Full email functionality

## Docker Setup

### Development with Docker

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Production with Docker

```bash
# Start production environment
docker-compose up -d

# Monitor services
docker-compose ps

# View logs
docker-compose logs -f
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### User Management
- `PUT /api/auth/profile` - Update profile

### System Health
- `GET /health` - Health check

## Frontend Development

The frontend is built with React and Vite. To develop the frontend separately:

```bash
cd backend
npm install
npm run dev
```

### Environment Variables for Frontend

Create a `.env` file in the `backend` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_ENVIRONMENT=development
```

## Security Features

- JWT-based authentication
- Rate limiting on authentication endpoints
- CSRF protection (disabled in development)
- Secure session cookies (production only)
- Input validation and sanitization
- HTTPS enforcement (production)

## Monitoring and Logging

### Development
- Console logging with debug level
- File logging to `logs/dev_server.log`

### Production
- Structured logging to `logs/prod_server.log`
- Gunicorn access and error logs
- Health check endpoints
- Docker health checks

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Backend default: 5000
   - Frontend default: 5173
   - Change ports in configuration if needed

2. **Database issues:**
   - Ensure PostgreSQL is running (production)
   - Check database permissions
   - Run migrations: `python backend/migrations.py`

3. **Dependency issues:**
   - Clear Python cache: `pip cache purge`
   - Clear Node.js cache: `npm cache clean --force`
   - Reinstall dependencies

4. **Environment variables:**
   - Check `.env` file syntax
   - Ensure required variables are set
   - Restart services after changes

### Logs

- Development: `logs/dev_server.log`
- Production: `logs/prod_server.log`
- Docker: `docker-compose logs`

## Deployment

### Production Deployment Checklist

- [ ] Set strong `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] Configure PostgreSQL database
- [ ] Set up Redis instance
- [ ] Configure SMTP for email
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall and security groups
- [ ] Set up monitoring and alerting
- [ ] Configure backups
- [ ] Test disaster recovery

### Scaling

- Use multiple Gunicorn workers
- Implement database connection pooling
- Add Redis clustering for high availability
- Use load balancers for multiple instances
- Implement CDN for static assets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

## License

[Add your license information here]

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation