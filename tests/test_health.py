"""
RED PHASE: 健康检查和边界条件测试
"""
import pytest


class TestHealthCheck:
    """健康检查 API 测试"""

    def test_health_check(self, client):
        """健康检查端点正常响应"""
        response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data


class TestRootEndpoint:
    """根路径重定向测试"""

    def test_root_redirects_to_frontend(self, client):
        """根路径重定向到前端页面"""
        response = client.get("/", follow_redirects=False)

        assert response.status_code == 307  # Temporary redirect


class TestEdgeCases:
    """边界条件测试"""

    def test_create_scenario_with_special_characters(self, client):
        """支持场景名称包含特殊字符"""
        data = {
            "name": "智能客服 - 测试场景 (v1.0)",
            "source_dept": "研发部",
            "existing_problems": ["人工投入大"]
        }
        response = client.post("/api/scenarios", json=data)

        assert response.status_code == 201
        assert response.json()["name"] == "智能客服 - 测试场景 (v1.0)"

    def test_create_scenario_with_empty_milestones(self, client):
        """支持空里程碑列表"""
        data = {
            "name": "无里程碑场景",
            "source_dept": "测试部",
            "milestone": []
        }
        response = client.post("/api/scenarios", json=data)

        assert response.status_code == 201
        assert response.json()["milestone"] == []

    def test_update_scenario_partial(self, client, created_scenario):
        """部分更新只修改指定字段"""
        # 只更新名称
        response = client.put(
            f"/api/scenarios/{created_scenario['id']}",
            json={"name": "新名称"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "新名称"
        # 其他字段保持不变
        assert data["source_dept"] == created_scenario["source_dept"]

    def test_filter_combinations(self, client):
        """支持多条件组合筛选"""
        # 创建多个场景
        scenarios = [
            {"name": "场景1", "source_dept": "A部", "maturity_level": 3, "category": "A"},
            {"name": "场景2", "source_dept": "A部", "maturity_level": 2, "category": "B"},
            {"name": "场景3", "source_dept": "B部", "maturity_level": 3, "category": "A"},
        ]
        for s in scenarios:
            client.post("/api/scenarios", json=s)

        # 组合筛选：A部门 + 成熟度3 + A类
        response = client.get("/api/scenarios?source_dept=A部&maturity_level=3&category=A")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "场景1"

    def test_list_scenarios_pagination(self, client):
        """支持分页"""
        # 创建5个场景
        for i in range(5):
            client.post("/api/scenarios", json={
                "name": f"场景{i+1}",
                "source_dept": "测试部"
            })

        # 每页2条，取第2页
        response = client.get("/api/scenarios?skip=2&limit=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
