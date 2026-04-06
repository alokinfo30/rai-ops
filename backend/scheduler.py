import atexit
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from flask import Flask

from .extensions import db
from .models import AITest, ComplianceLog, ScheduledTest
from .services import simulate_redteam_attack

logger = logging.getLogger(__name__)

def run_scheduled_test_logic(app: Flask, test_id: int):
    """Execution logic for a single scheduled test."""
    with app.app_context():
        scheduled = ScheduledTest.query.get(test_id)
        if not scheduled or not scheduled.is_active:
            return

        logger.info(f"Running scheduled test: {scheduled.test_name}")
        
        # Create a new AITest record representing this run
        new_test = AITest(
            user_id=scheduled.user_id,
            test_name=f"[Scheduled] {scheduled.test_name}",
            test_type=scheduled.test_type,
            target_system=scheduled.target_system,
            status="running"
        )
        db.session.add(new_test)
        db.session.commit()
        
        try:
            results = simulate_redteam_attack(scheduled.test_type, scheduled.target_system)
            new_test.results = results
            new_test.status = "completed"
            new_test.completed_at = datetime.utcnow()
            
            scheduled.last_run = datetime.utcnow()
            
            log = ComplianceLog(
                user_id=scheduled.user_id,
                action="SCHEDULED_TEST_RUN",
                resource=f"test/{new_test.id}",
                status="SUCCESS",
                details={"scheduled_test_id": scheduled.id},
                ip_address="system"
            )
            db.session.add(log)
            db.session.commit()
        except Exception as e:
            logger.error(f"Scheduled test execution failed: {e}")
            new_test.status = "failed"
            db.session.commit()

def check_for_tests(app: Flask):
    """Periodic check to see if any tests qualify to run based on interval."""
    with app.app_context():
        tests = ScheduledTest.query.filter_by(is_active=True).all()
        now = datetime.utcnow()
        
        interval_map = {
            "daily": timedelta(days=1),
            "weekly": timedelta(weeks=1),
            "monthly": timedelta(days=30)
        }

        for test in tests:
            # If never run, check start_date. If run, check interval.
            delta = interval_map.get(test.schedule_interval.value, timedelta(days=1))
            last_time = test.last_run or test.start_date
            
            if last_time and (last_time + delta <= now or (not test.last_run and test.start_date <= now)):
                run_scheduled_test_logic(app, test.id)

def archive_logs(app: Flask):
    """Archives (deletes) logs older than 90 days to maintain database health."""
    with app.app_context():
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=90)
            deleted_count = ComplianceLog.query.filter(ComplianceLog.timestamp < cutoff_date).delete()
            db.session.commit()
            if deleted_count > 0:
                logger.info(f"Maintenance: Archived {deleted_count} old compliance logs.")
        except Exception as e:
            logger.error(f"Maintenance failed: {e}")

def start_scheduler(app: Flask):
    """Starts the background scheduler."""
    scheduler = BackgroundScheduler()
    
    # Run the check every 60 seconds
    scheduler.add_job(
        func=check_for_tests,
        trigger=IntervalTrigger(seconds=60),
        args=[app],
        id='test_scanner',
        replace_existing=True
    )
    
    # Run log archiver every 24 hours
    scheduler.add_job(
        func=archive_logs,
        trigger=IntervalTrigger(hours=24),
        args=[app],
        id='log_archiver',
        replace_existing=True
    )
    
    scheduler.start()
    atexit.register(lambda: scheduler.shutdown())