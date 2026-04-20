import pytest
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set test database path before importing
import tempfile
temp_dir = tempfile.mkdtemp()
os.environ["TEST_DB_PATH"] = os.path.join(temp_dir, "test_scenarios.db")


@pytest.fixture(scope="function")
def test_db():
    """Create a fresh test database for each test."""
    from backend.database import engine, Base, SessionLocal

    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Create a test client for the FastAPI app."""
    from fastapi.testclient import TestClient
    from backend.main import app

    # Override the database dependency
    from backend.database import get_db

    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def sample_scenario_data():
    """Sample scenario data for testing."""
    return {
        "name": "智能客服场景",
        "group_name": "AI应用组",
        "source_dept": "客户服务部",
        "reporter": "张三",
        "contact": "zhangsan@company.com",
        "business_background": "客服部门每天处理大量重复性问题",
        "existing_problems": ["人工投入大", "响应慢", "质量不稳定"],
        "ai_goals": "通过AI自动回复常见问题，减少人工投入",
        "current_status": "无项目",
        "maturity_level": 2,
        "lifecycle_status": "对接中",
        "director_status": 1,
        "director_name": "李四",
        "biz_value_score": 4,
        "pain_point_score": 5,
        "frequency_score": 5,
        "feasibility_score": 3,
        "replicability_score": 4,
        "ai_fit_score": 4,
        "risk_control_score": 4,
        "expected_benefit": "预计节省50%人工成本",
        "required_investment": "需要1个产品经理+2个开发",
        "roi_judgment": "高收益/高投入",
        "category": "A",
        "category_reason": "业务价值高，需求真实",
        "cooperation_willingness": 3,
        "internal_priority": 1,
        "goal_1month": "完成需求调研",
        "goal_3month": "完成POC验证",
        "milestone": [
            {"name": "需求调研", "plan_date": "2026-05-01", "status": "进行中"},
            {"name": "POC验证", "plan_date": "2026-06-01", "status": "未开始"},
        ],
        "required_support": ["管理支持", "数据权限"],
        "next_followup_date": "2026-05-01"
    }


@pytest.fixture(scope="function")
def created_scenario(client, sample_scenario_data):
    """Create a scenario and return its data including the generated ID."""
    response = client.post("/api/scenarios", json=sample_scenario_data)
    assert response.status_code == 201
    return response.json()
