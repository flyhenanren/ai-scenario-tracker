from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scene_code = Column(String(20), unique=True, index=True, nullable=False)

    # 基本信息
    name = Column(String(200), nullable=False)
    group_name = Column(String(100))
    source_dept = Column(String(100))
    reporter = Column(String(100))
    contact = Column(String(200))
    contact_ext = Column(String(200))
    is_repeat = Column(Boolean, default=False)
    repeat_codes = Column(String(200))

    # 业务背景
    business_background = Column(Text)
    existing_problems = Column(JSON, default=list)
    other_problem_reason = Column(String(500))  # 其他问题原因
    ai_goals = Column(Text)

    # 业务参与人员
    business_participants = Column(String(200))
    participating_posts = Column(String(200))
    business_flow = Column(Text)  # 业务流程简述

    # 当前现状
    current_status = Column(String(50))
    progress = Column(Text)
    current_problems = Column(Text)
    maturity_level = Column(Integer, default=1)  # L1-L5
    lifecycle_status = Column(String(50), default="对接中")

    # 当前应用现状
    current_project_status = Column(Boolean, default=False)  # 是否有项目在用
    current_project_desc = Column(Text)  # 项目说明

    # 负责人
    director_status = Column(Integer, default=0)  # 0=未指定 1=模糊 2=无人
    director_name = Column(String(100))
    director_note = Column(String(500))

    # 盘活路径（针对已完工未应用场景）
    revival_path = Column(Text)
    revival_path_options = Column(JSON, default=list)  # 盘活路径多选
    revival_conclusion = Column(Text)

    # 评分（7维度）
    biz_value_score = Column(Integer, default=0)
    pain_point_score = Column(Integer, default=0)
    frequency_score = Column(Integer, default=0)
    feasibility_score = Column(Integer, default=0)
    replicability_score = Column(Integer, default=0)
    ai_fit_score = Column(Integer, default=0)
    risk_control_score = Column(Integer, default=0)
    total_score = Column(Integer, default=0)

    # 投入产出
    expected_benefit = Column(Text)
    expected_benefit_details = Column(JSON, default=dict)  # 预期收益明细(5项)
    required_investment = Column(Text)
    required_investment_details = Column(JSON, default=dict)  # 所需投入明细(5项)
    roi_judgment = Column(String(50))

    # 分类结论
    category = Column(String(10))  # A/B/C
    category_reason = Column(Text)
    cooperation_willingness = Column(Integer, default=0)  # 0=未知 1=低 2=中 3=高
    internal_priority = Column(Integer, default=0)

    # 推进计划
    goal_1month = Column(Text)
    goal_3month = Column(Text)
    milestone = Column(JSON, default=list)
    promotion_path_options = Column(JSON, default=list)  # 推进路径多选
    required_support = Column(JSON, default=list)

    # 时间管理
    initial_filing_date = Column(DateTime)
    next_followup_date = Column(Date)
    last_followup_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联
    followups = relationship("FollowUp", back_populates="scenario", cascade="all, delete-orphan")


class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scene_id = Column(Integer, ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    scene_code = Column(String(20), nullable=False, index=True)

    followup_round = Column(Integer, default=1)
    followup_date = Column(DateTime, default=datetime.utcnow)
    followup_by = Column(String(100))

    interval_type = Column(String(20))  # 1个月/2个月/超过2个月

    lifecycle_status = Column(String(50))
    maturity_level = Column(Integer)
    maturity_changed = Column(Boolean, default=False)
    maturity_change_desc = Column(String(100))

    category = Column(String(10))
    category_changed = Column(Boolean, default=False)
    category_change_reason = Column(String(200))

    milestone_records = Column(JSON, default=list)

    cooperation_willingness = Column(Integer)
    cooperation_changed = Column(Boolean, default=False)
    cooperation_change_reason = Column(String(200))

    progress_summary = Column(Text)
    problems = Column(Text)
    next_plan = Column(Text)

    need_adjust_goal = Column(Boolean, default=False)
    adjustment_desc = Column(Text)

    next_followup_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关联
    scenario = relationship("Scenario", back_populates="followups")
