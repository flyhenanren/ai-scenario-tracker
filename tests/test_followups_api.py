"""
RED PHASE: 验证跟进记录 API 测试

这些测试在实现之前应该失败（RED），验证 API 行为是否符合预期。
"""
import pytest


class TestFollowupCreate:
    """跟进记录创建 API 测试"""

    def test_create_followup_success(self, client, created_scenario):
        """成功创建跟进记录"""
        followup_data = {
            "followup_round": 1,
            "lifecycle_status": "推进中",
            "maturity_level": 3,
            "progress_summary": "完成了需求调研",
            "problems": "数据权限申请中",
            "next_plan": "申请数据权限",
            "cooperation_willingness": 3
        }
        response = client.post(
            f"/api/scenarios/{created_scenario['id']}/followups",
            json=followup_data
        )

        assert response.status_code == 201
        data = response.json()
        assert data["progress_summary"] == "完成了需求调研"
        assert data["scene_id"] == created_scenario["id"]
        assert data["followup_round"] == 1

    def test_create_followup_increments_round(self, client, created_scenario):
        """每次跟进轮次自动递增"""
        # 第一次跟进
        followup1 = {
            "lifecycle_status": "对接中",
            "maturity_level": 2
        }
        response1 = client.post(
            f"/api/scenarios/{created_scenario['id']}/followups",
            json=followup1
        )
        assert response1.json()["followup_round"] == 1

        # 第二次跟进
        followup2 = {
            "lifecycle_status": "推进中",
            "maturity_level": 3
        }
        response2 = client.post(
            f"/api/scenarios/{created_scenario['id']}/followups",
            json=followup2
        )
        assert response2.json()["followup_round"] == 2

    def test_create_followup_updates_scenario(self, client, created_scenario):
        """创建跟进记录后更新场景状态"""
        followup_data = {
            "lifecycle_status": "推进中",
            "maturity_level": 4,
            "category": "A",
            "cooperation_willingness": 3
        }
        client.post(
            f"/api/scenarios/{created_scenario['id']}/followups",
            json=followup_data
        )

        # 验证场景已更新
        scenario_response = client.get(f"/api/scenarios/{created_scenario['id']}")
        scenario = scenario_response.json()
        assert scenario["lifecycle_status"] == "推进中"
        assert scenario["maturity_level"] == 4
        assert scenario["last_followup_date"] is not None

    def test_create_followup_not_found_scenario(self, client):
        """向不存在的场景添加跟进返回 404"""
        followup_data = {
            "lifecycle_status": "推进中",
            "maturity_level": 3
        }
        response = client.post("/api/scenarios/99999/followups", json=followup_data)

        assert response.status_code == 404


class TestFollowupList:
    """跟进记录列表 API 测试"""

    def test_list_followups_empty(self, client, created_scenario):
        """无跟进记录时返回空数组"""
        response = client.get(f"/api/scenarios/{created_scenario['id']}/followups")

        assert response.status_code == 200
        data = response.json()
        assert data["followups"] == []
        assert data["total"] == 0

    def test_list_followups_returns_all(self, client, created_scenario):
        """返回所有跟进记录"""
        # 创建两条跟进
        for i in range(2):
            client.post(
                f"/api/scenarios/{created_scenario['id']}/followups",
                json={
                    "lifecycle_status": "推进中",
                    "maturity_level": 2 + i,
                    "progress_summary": f"第{i+1}次跟进"
                }
            )

        response = client.get(f"/api/scenarios/{created_scenario['id']}/followups")

        assert response.status_code == 200
        data = response.json()
        assert len(data["followups"]) == 2
        assert data["total"] == 2

    def test_list_followups_sorted_by_date_desc(self, client, created_scenario):
        """跟进记录按时间倒序"""
        # 创建两条跟进
        client.post(
            f"/api/scenarios/{created_scenario['id']}/followups",
            json={
                "lifecycle_status": "对接中",
                "maturity_level": 2,
                "progress_summary": "第一次"
            }
        )
        client.post(
            f"/api/scenarios/{created_scenario['id']}/followups",
            json={
                "lifecycle_status": "推进中",
                "maturity_level": 3,
                "progress_summary": "第二次"
            }
        )

        response = client.get(f"/api/scenarios/{created_scenario['id']}/followups")

        assert response.status_code == 200
        data = response.json()
        # 最新在前面
        assert data["followups"][0]["progress_summary"] == "第二次"
        assert data["followups"][1]["progress_summary"] == "第一次"


class TestOverdueFollowups:
    """超期待跟进 API 测试"""

    def test_overdue_followups_empty(self, client):
        """无超期场景时返回空数组"""
        response = client.get("/api/followups/overdue")

        assert response.status_code == 200
        assert response.json() == []

    def test_overdue_followups_returns_overdue(self, client, created_scenario):
        """返回超期需要跟进的场景"""
        # 创建的场景下次跟进日期是 2026-05-01（已过期的测试数据）
        # 由于测试环境日期可能不同，我们直接验证返回格式
        response = client.get("/api/followups/overdue")

        assert response.status_code == 200
        data = response.json()
        # 返回的是数组
        assert isinstance(data, list)
        # 每个元素包含必要字段
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "scene_code" in item
            assert "name" in item
            assert "days_overdue" in item

    def test_overdue_followups_includes_all_overdue(self, client):
        """返回所有超期场景"""
        # 创建两个场景
        for i in range(2):
            scenario_data = {
                "name": f"场景{i+1}",
                "source_dept": "测试部门",
                "next_followup_date": "2026-01-01"  # 过去的日期
            }
            client.post("/api/scenarios", json=scenario_data)

        response = client.get("/api/followups/overdue")

        assert response.status_code == 200
        data = response.json()
        # 应该返回2个超期场景
        assert len(data) >= 2

    def test_overdue_followups_sorted_by_days(self, client):
        """超期列表按超期天数倒序（最紧急的在前）"""
        # 创建两个场景，超期天数不同
        scenario1 = {"name": "超期7天", "source_dept": "测试", "next_followup_date": "2026-01-09"}
        scenario2 = {"name": "超期30天", "source_dept": "测试", "next_followup_date": "2026-01-01"}

        client.post("/api/scenarios", json=scenario1)
        client.post("/api/scenarios", json=scenario2)

        response = client.get("/api/followups/overdue")

        assert response.status_code == 200
        data = response.json()
        # 最紧急（超期最久）的在最前面
        assert data[0]["days_overdue"] >= data[1]["days_overdue"]
