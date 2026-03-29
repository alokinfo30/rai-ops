# RAI Ops Platform - Feature Summary & Demo Guide

## Implemented Features

### 1. Authentication & User Management
- **JWT Authentication**: Secure login with access and refresh tokens.
- **Rate Limiting**: Brute-force protection on login endpoints (Redis/Memory backed).
- **Profile Management**: Update company info, password, and view role details.

### 2. Dashboard
- **Real-time Stats**: Aggregated view of Compliance Scores, Active Alerts, and Monitored Models.
- **Interactive Charts**: 7-day trend analysis of Security Tests vs. Alerts.
- **Activity Feed**: Unified stream of user actions and system logs.

### 3. Red Team Lab (Adversarial Testing)
- **Test Management**: Create, view, and retry security tests against AI targets.
- **Simulation Engine**: Simulates attacks like Prompt Injection, PII Leakage, and Jailbreaks.
- **Reporting**: Automated generation of PDF audit reports for specific tests.
- **Vulnerability Tracking**: Track status of found vulnerabilities (New, In Progress, Resolved).

### 4. Continuous Monitoring
- **Drift Detection**: Simulates model metric drift (Accuracy, Latency, Fairness).
- **Alerting System**: Generates alerts when metrics cross defined thresholds.
- **Resolution Workflow**: Interface to acknowledge and resolve active alerts.

### 5. Knowledge & Expert Systems
- **Expert Session**: Captures domain knowledge (Expert Name, Experience, Domain).
- **Knowledge Graph**: Generates structured insights and decision trees (simulated or via OpenAI).
- **Virtual Apprentice**: An interactive interface that "answers" questions based on the captured expert logic.

### 6. Compliance & Reporting
- **Audit Logs**: Immutable logs of all critical system actions (test creation, profile updates, etc.).
- **PDF Exports**: Downloadable compliance summary reports.
- **Email Integration**: Background task processing for sending reports (simulated fallback).

---

## Red Teaming Workflow Demo

Follow these steps to demonstrate the core value proposition of the platform:

### Step 1: Login
1. Navigate to `/login`.
2. Use the default credentials (created on startup if DB is empty):
   - **Username**: `admin`
   - **Password**: `admin123`

### Step 2: Create a Target
1. Go to **Red Team Lab** in the sidebar.
2. Click the **"New Test"** button.
3. Fill in the form:
   - **Name**: `Alpha-1 Injection Test`
   - **Type**: `Prompt Injection`
   - **Target**: `Customer Support Chatbot v2`
4. Click **"Save Test"**. The test will appear in the list with status `Pending`.

### Step 3: Execute Attack
1. Find `Alpha-1 Injection Test` in the list.
2. Click the **Play** (Run) button.
3. The status will change to `Running`, then `Completed` (simulated delay).
4. Once completed, a **Report** button appears.

### Step 4: Analyze & Report
1. Click **Report** (or export PDF icon) to download the `test_report_X.pdf`.
2. Open the PDF to view the **Risk Level**, **Overall Score**, and **Vulnerabilities Found**.