from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, date


# ============ 场景 Schema ============

class ScenarioBase(BaseModel):
    name: str
    group_name: Optional[str] = None
    source_dept: Optional[str] = None
    reporter: Optional[str] = None
    contact: Optional[str] = None
    contact_ext: Optional[str] = None
    is_repeat: bool = False
    repeat_codes: Optional[str] = None

    business_background: Optional[str] = None
    existing_problems: Optional[List[str]] = []
    other_problem_reason: Optional[str] = None  # 其他问题原因
    ai_goals: Optional[str] = None

    # 业务参与人员
    business_participants: Optional[str] = None
    participating_posts: Optional[str] = None
    business_flow: Optional[str] = None  # 业务流程简述

    current_status: Optional[str] = None
    progress: Optional[str] = None
    current_problems: Optional[str] = None
    maturity_level: int = 1
    lifecycle_status: str = "对接中"

    # 当前应用现状
    current_project_status: Optional[bool] = False  # 是否有项目在用
    current_project_desc: Optional[str] = None  # 项目说明

    director_status: int = 0
    director_name: Optional[str] = None
    director_note: Optional[str] = None

    revival_path: Optional[str] = None
    revival_path_options: Optional[List[str]] = []  # 盘活路径多选
    revival_conclusion: Optional[str] = None

    biz_value_score: int = 0
    pain_point_score: int = 0
    frequency_score: int = 0
    feasibility_score: int = 0
    replicability_score: int = 0
    ai_fit_score: int = 0
    risk_control_score: int = 0

    expected_benefit: Optional[str] = None
    expected_benefit_details: Optional[dict] = {}  # 预期收益明细(5项)
    required_investment: Optional[str] = None
    required_investment_details: Optional[dict] = {}  # 所需投入明细(5项)
    roi_judgment: Optional[str] = None

    category: Optional[str] = None
    category_reason: Optional[str] = None
    cooperation_willingness: int = 0
    internal_priority: int = 0

    goal_1month: Optional[str] = None
    goal_3month: Optional[str] = None
    milestone: Optional[List[dict]] = []
    promotion_path_options: Optional[List[str]] = []  # 推进路径多选
    required_support: Optional[List[str]] = []

    next_followup_date: Optional[date] = None


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    group_name: Optional[str] = None
    source_dept: Optional[str] = None
    reporter: Optional[str] = None
    contact: Optional[str] = None
    contact_ext: Optional[str] = None
    is_repeat: Optional[bool] = None
    repeat_codes: Optional[str] = None

    business_background: Optional[str] = None
    existing_problems: Optional[List[str]] = None
    other_problem_reason: Optional[str] = None
    ai_goals: Optional[str] = None

    business_participants: Optional[str] = None
    participating_posts: Optional[str] = None
    business_flow: Optional[str] = None

    current_status: Optional[str] = None
    progress: Optional[str] = None
    current_problems: Optional[str] = None
    maturity_level: Optional[int] = None
    lifecycle_status: Optional[str] = None

    current_project_status: Optional[bool] = None
    current_project_desc: Optional[str] = None

    director_status: Optional[int] = None
    director_name: Optional[str] = None
    director_note: Optional[str] = None

    revival_path: Optional[str] = None
    revival_path_options: Optional[List[str]] = None
    revival_conclusion: Optional[str] = None

    biz_value_score: Optional[int] = None
    pain_point_score: Optional[int] = None
    frequency_score: Optional[int] = None
    feasibility_score: Optional[int] = None
    replicability_score: Optional[int] = None
    ai_fit_score: Optional[int] = None
    risk_control_score: Optional[int] = None

    expected_benefit: Optional[str] = None
    expected_benefit_details: Optional[dict] = None
    required_investment: Optional[str] = None
    required_investment_details: Optional[dict] = None
    roi_judgment: Optional[str] = None

    category: Optional[str] = None
    category_reason: Optional[str] = None
    cooperation_willingness: Optional[int] = None
    internal_priority: Optional[int] = None

    goal_1month: Optional[str] = None
    goal_3month: Optional[str] = None
    milestone: Optional[List[dict]] = None
    promotion_path_options: Optional[List[str]] = None
    required_support: Optional[List[str]] = None

    next_followup_date: Optional[date] = None


class ScenarioResponse(ScenarioBase):
    id: int
    scene_code: str
    total_score: int
    initial_filing_date: Optional[datetime] = None
    last_followup_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScenarioListResponse(BaseModel):
    id: int
    scene_code: str
    name: str
    source_dept: Optional[str] = None
    maturity_level: int
    lifecycle_status: str
    category: Optional[str] = None
    director_status: int
    cooperation_willingness: int
    next_followup_date: Optional[date] = None
    last_followup_date: Optional[datetime] = None
    total_score: int

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    total: int
    by_lifecycle: dict
    by_category: dict
    by_maturity: dict
    overdue_count: int
    need_followup_count: int


# ============ 跟进记录 Schema ============

class FollowUpBase(BaseModel):
    followup_round: int = 1
    interval_type: Optional[str] = None
    lifecycle_status: str
    maturity_level: int
    maturity_changed: bool = False
    maturity_change_desc: Optional[str] = None
    category: Optional[str] = None
    category_changed: bool = False
    category_change_reason: Optional[str] = None
    milestone_records: Optional[List[dict]] = []
    cooperation_willingness: int = 0
    cooperation_changed: bool = False
    cooperation_change_reason: Optional[str] = None
    progress_summary: Optional[str] = None
    problems: Optional[str] = None
    next_plan: Optional[str] = None
    need_adjust_goal: bool = False
    adjustment_desc: Optional[str] = None
    next_followup_date: Optional[date] = None


class FollowUpCreate(FollowUpBase):
    followup_by: Optional[str] = None


class FollowUpResponse(FollowUpBase):
    id: int
    scene_id: int
    scene_code: str
    followup_date: datetime
    followup_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FollowUpListResponse(BaseModel):
    followups: List[FollowUpResponse]
    total: int
