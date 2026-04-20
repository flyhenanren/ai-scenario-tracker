"""
RED PHASE: 验证场景 CRUD API 测试

这些测试在实现之前应该失败（RED），验证 API 行为是否符合预期。
"""
import pytest


class TestScenarioCreate:
    """场景创建 API 测试"""

    def test_create_scenario_success(self, client, sample_scenario_data):
        """成功创建一个场景"""
        response = client.post("/api/scenarios", json=sample_scenario_data)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_scenario_data["name"]
        assert data["source_dept"] == sample_scenario_data["source_dept"]
        assert data["scene_code"].startswith("AI-")
        assert data["total_score"] > 0

    def test_create_scenario_auto_generates_code(self, client, sample_scenario_data):
        """场景编号自动生成，格式为 AI-YYYYMMDD-XXX"""
        response = client.post("/api/scenarios", json=sample_scenario_data)

        assert response.status_code == 201
        data = response.json()
        # 格式验证
        assert data["scene_code"].startswith("AI-")
        parts = data["scene_code"].split("-")
        assert len(parts) == 3
        assert len(parts[1]) == 8  # YYYYMMDD
        assert len(parts[2]) == 3  # XXX

    def test_create_scenario_calculates_total_score(self, client, sample_scenario_data):
        """总分自动计算"""
        response = client.post("/api/scenarios", json=sample_scenario_data)

        assert response.status_code == 201
        data = response.json()

        expected_total = (
            sample_scenario_data["biz_value_score"] +
            sample_scenario_data["pain_point_score"] +
            sample_scenario_data["frequency_score"] +
            sample_scenario_data["feasibility_score"] +
            sample_scenario_data["replicability_score"] +
            sample_scenario_data["ai_fit_score"] +
            sample_scenario_data["risk_control_score"]
        )
        assert data["total_score"] == expected_total

    def test_create_scenario_requires_name(self, client):
        """场景名称是必填字段"""
        invalid_data = {"source_dept": "测试部门"}
        response = client.post("/api/scenarios", json=invalid_data)

        # FastAPI 默认返回 422 表示验证错误
        assert response.status_code == 422

    def test_create_scenario_stores_milestones(self, client, sample_scenario_data):
        """里程碑正确存储"""
        response = client.post("/api/scenarios", json=sample_scenario_data)

        assert response.status_code == 201
        data = response.json()
        assert len(data["milestone"]) == 2
        assert data["milestone"][0]["name"] == "需求调研"


class TestScenarioList:
    """场景列表 API 测试"""

    def test_list_scenarios_empty(self, client):
        """空列表返回空数组"""
        response = client.get("/api/scenarios")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_scenarios_returns_all(self, client, created_scenario):
        """返回所有已创建的场景"""
        response = client.get("/api/scenarios")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == created_scenario["name"]

    def test_list_scenarios_filter_by_dept(self, client, created_scenario):
        """支持按部门筛选"""
        response = client.get("/api/scenarios?source_dept=客户服务部")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["source_dept"] == "客户服务部"

    def test_list_scenarios_filter_by_maturity(self, client, created_scenario):
        """支持按成熟度筛选"""
        response = client.get("/api/scenarios?maturity_level=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["maturity_level"] == 2

    def test_list_scenarios_filter_by_lifecycle(self, client, created_scenario):
        """支持按生命周期筛选"""
        response = client.get("/api/scenarios?lifecycle_status=对接中")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["lifecycle_status"] == "对接中"

    def test_list_scenarios_filter_by_category(self, client, created_scenario):
        """支持按分类筛选"""
        response = client.get("/api/scenarios?category=A")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["category"] == "A"

    def test_list_scenarios_filter_by_dept_no_match(self, client, created_scenario):
        """筛选无结果时返回空数组"""
        response = client.get("/api/scenarios?source_dept=不存在的部门")

        assert response.status_code == 200
        assert response.json() == []


class TestScenarioGet:
    """获取单个场景 API 测试"""

    def test_get_scenario_success(self, client, created_scenario):
        """成功获取单个场景"""
        response = client.get(f"/api/scenarios/{created_scenario['id']}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_scenario["id"]
        assert data["name"] == created_scenario["name"]

    def test_get_scenario_not_found(self, client):
        """场景不存在返回 404"""
        response = client.get("/api/scenarios/99999")

        assert response.status_code == 404
        assert "不存在" in response.json()["detail"]


class TestScenarioUpdate:
    """场景更新 API 测试"""

    def test_update_scenario_success(self, client, created_scenario):
        """成功更新场景"""
        update_data = {
            "name": "更新后的场景名称",
            "maturity_level": 3,
            "lifecycle_status": "推进中"
        }
        response = client.put(
            f"/api/scenarios/{created_scenario['id']}",
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "更新后的场景名称"
        assert data["maturity_level"] == 3
        assert data["lifecycle_status"] == "推进中"

    def test_update_scenario_recalculates_score(self, client, created_scenario):
        """更新评分字段后总分重新计算"""
        update_data = {
            "biz_value_score": 5,
            "pain_point_score": 5
        }
        response = client.put(
            f"/api/scenarios/{created_scenario['id']}",
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        # 总分应该变化
        assert data["total_score"] != created_scenario["total_score"]

    def test_update_scenario_not_found(self, client):
        """更新不存在的场景返回 404"""
        update_data = {"name": "测试"}
        response = client.put("/api/scenarios/99999", json=update_data)

        assert response.status_code == 404


class TestScenarioDelete:
    """场景删除 API 测试"""

    def test_delete_scenario_success(self, client, created_scenario):
        """成功删除场景"""
        response = client.delete(f"/api/scenarios/{created_scenario['id']}")

        assert response.status_code == 204

        # 验证已删除
        get_response = client.get(f"/api/scenarios/{created_scenario['id']}")
        assert get_response.status_code == 404

    def test_delete_scenario_not_found(self, client):
        """删除不存在的场景返回 404"""
        response = client.delete("/api/scenarios/99999")

        assert response.status_code == 404

    def test_delete_scenario_cascade_followups(self, client, created_scenario):
        """删除场景时级联删除跟进记录"""
        # 先创建一条跟进记录
        followup_data = {
            "lifecycle_status": "推进中",
            "maturity_level": 3,
            "progress_summary": "第一次跟进"
        }
        client.post(
            f"/api/scenarios/{created_scenario['id']}/followups",
            json=followup_data
        )

        # 删除场景
        response = client.delete(f"/api/scenarios/{created_scenario['id']}")
        assert response.status_code == 204


class TestScenarioStats:
    """场景统计 API 测试"""

    def test_get_stats_empty(self, client):
        """空数据库返回零值统计"""
        response = client.get("/api/scenarios/stats")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["by_lifecycle"] == {}
        assert data["by_category"] == {}
        assert data["by_maturity"] == {}

    def test_get_stats_with_data(self, client, created_scenario):
        """有数据时正确统计"""
        response = client.get("/api/scenarios/stats")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["by_lifecycle"]["对接中"] == 1
        assert data["by_category"]["A"] == 1
        assert data["by_maturity"]["2"] == 1
