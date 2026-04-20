from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, date

from backend.database import get_db
from backend.models import Scenario, FollowUp
from backend.schemas import (
    ScenarioCreate, ScenarioUpdate, ScenarioResponse,
    ScenarioListResponse, StatsResponse
)

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


def generate_scene_code(db: Session) -> str:
    """Generate unique scene code with retry logic for race conditions."""
    max_retries = 5
    for attempt in range(max_retries):
        today = datetime.now().strftime("%Y%m%d")
        prefix = f"AI-{today}-"

        last_scene = db.query(Scenario).filter(
            Scenario.scene_code.like(f"{prefix}%")
        ).order_by(Scenario.scene_code.desc()).first()

        if last_scene:
            last_num = int(last_scene.scene_code.split("-")[-1])
            new_num = last_num + 1
        else:
            new_num = 1

        new_code = f"{prefix}{new_num:03d}"

        # Check if code already exists (race condition handling)
        existing = db.query(Scenario).filter(Scenario.scene_code == new_code).first()
        if existing:
            if attempt < max_retries - 1:
                db.rollback()
                continue
            else:
                raise HTTPException(status_code=500, detail="Failed to generate unique scene code")
        return new_code

    raise HTTPException(status_code=500, detail="Failed to generate unique scene code")


@router.get("", response_model=List[ScenarioListResponse])
def list_scenarios(
    source_dept: Optional[str] = None,
    maturity_level: Optional[int] = None,
    lifecycle_status: Optional[str] = None,
    category: Optional[str] = None,
    overdue: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Scenario)

    if source_dept:
        query = query.filter(Scenario.source_dept == source_dept)
    if maturity_level:
        query = query.filter(Scenario.maturity_level == maturity_level)
    if lifecycle_status:
        query = query.filter(Scenario.lifecycle_status == lifecycle_status)
    if category:
        query = query.filter(Scenario.category == category)

    scenarios = query.order_by(Scenario.updated_at.desc()).offset(skip).limit(limit).all()

    result = []
    today = date.today()
    for s in scenarios:
        days_since_followup = None
        if s.last_followup_date:
            delta = today - s.last_followup_date.date()
            days_since_followup = delta.days

        item = ScenarioListResponse(
            id=s.id,
            scene_code=s.scene_code,
            name=s.name,
            source_dept=s.source_dept,
            maturity_level=s.maturity_level,
            lifecycle_status=s.lifecycle_status,
            category=s.category,
            director_status=s.director_status,
            cooperation_willingness=s.cooperation_willingness,
            next_followup_date=s.next_followup_date,
            last_followup_date=s.last_followup_date,
            total_score=s.total_score
        )
        result.append(item)

    # Filter overdue in Python (SQLite date comparison is tricky)
    if overdue is not None:
        if overdue:
            result = [r for r in result if r.next_followup_date and r.next_followup_date < today]
        else:
            result = [r for r in result if not r.next_followup_date or r.next_followup_date >= today]

    return result


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Scenario).count()

    # Count by lifecycle
    lifecycle_counts = db.query(
        Scenario.lifecycle_status,
        func.count(Scenario.id)
    ).group_by(Scenario.lifecycle_status).all()
    by_lifecycle = {k: v for k, v in lifecycle_counts}

    # Count by category
    category_counts = db.query(
        Scenario.category,
        func.count(Scenario.id)
    ).filter(Scenario.category.isnot(None)).group_by(Scenario.category).all()
    by_category = {k: v for k, v in category_counts}

    # Count by maturity
    maturity_counts = db.query(
        Scenario.maturity_level,
        func.count(Scenario.id)
    ).group_by(Scenario.maturity_level).all()
    by_maturity = {str(k): v for k, v in maturity_counts}

    # Overdue count
    today = date.today()
    overdue_count = db.query(Scenario).filter(
        Scenario.next_followup_date < today
    ).count()

    # Need followup count (next_followup_date <= today + 7 days)
    from datetime import timedelta
    need_followup_count = db.query(Scenario).filter(
        Scenario.next_followup_date <= today + timedelta(days=7),
        Scenario.next_followup_date >= today
    ).count()

    return StatsResponse(
        total=total,
        by_lifecycle=by_lifecycle,
        by_category=by_category,
        by_maturity=by_maturity,
        overdue_count=overdue_count,
        need_followup_count=need_followup_count
    )


@router.get("/search", response_model=List[ScenarioListResponse])
def search_scenarios(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    db: Session = Depends(get_db)
):
    """搜索场景，用于重复场景选择"""
    query = db.query(Scenario).filter(
        Scenario.name.contains(q) | Scenario.scene_code.contains(q)
    ).limit(20).all()

    result = []
    for s in query:
        item = ScenarioListResponse(
            id=s.id,
            scene_code=s.scene_code,
            name=s.name,
            source_dept=s.source_dept,
            maturity_level=s.maturity_level,
            lifecycle_status=s.lifecycle_status,
            category=s.category,
            director_status=s.director_status,
            cooperation_willingness=s.cooperation_willingness,
            next_followup_date=s.next_followup_date,
            last_followup_date=s.last_followup_date,
            total_score=s.total_score
        )
        result.append(item)
    return result


@router.get("/{scene_id}/export")
def export_scenario(scene_id: int, db: Session = Depends(get_db)):
    """导出场景为Markdown文档"""
    scenario = db.query(Scenario).filter(Scenario.id == scene_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    followups = db.query(FollowUp).filter(
        FollowUp.scene_id == scene_id
    ).order_by(FollowUp.followup_date.desc()).all()

    content = _generate_markdown(scenario, followups)
    filename = f"AI场景评估报告_{scenario.scene_code}.md"

    return {
        "content": content,
        "filename": filename
    }


def _generate_markdown(scenario: Scenario, followups: list) -> str:
    """生成Markdown格式的场景评估报告"""

    # 存活状态映射
    director_status_map = {0: "未指定", 1: "模糊", 2: "无人负责"}
    maturity_map = {1: "L1 概念阶段", 2: "L2 试用阶段", 3: "L3 试点阶段", 4: "L4 推广阶段", 5: "L5 机制化阶段"}
    willingness_map = {0: "未知", 1: "低", 2: "中", 3: "高"}

    lines = [
        "# AI场景评估报告",
        "",
        f"**场景编号**：{scenario.scene_code}",
        f"**场景名称**：{scenario.name}",
        f"**来源部门**：{scenario.source_dept or '-'}",
        f"**填报人**：{scenario.reporter or '-'}",
        f"**填报时间**：{scenario.initial_filing_date.strftime('%Y-%m-%d') if scenario.initial_filing_date else '-'}",
        "",
        "---",
        "",
        "## 一、基本信息",
        "",
        f"| 字段 | 内容 |",
        f"|---|---|",
        f"| 场景编号 | {scenario.scene_code} |",
        f"| 场景名称 | {scenario.name} |",
        f"| 所属小组 | {scenario.group_name or '-'} |",
        f"| 来源部门 | {scenario.source_dept or '-'} |",
        f"| 填报人 | {scenario.reporter or '-'} |",
        f"| 联系方式 | {scenario.contact or '-'}{f' ({scenario.contact_ext})' if scenario.contact_ext else ''} |",
        f"| 是否与已有场景重复 | {'是' if scenario.is_repeat else '否'}{f'（重复场景编号：{scenario.repeat_codes}）' if scenario.is_repeat and scenario.repeat_codes else ''} |",
        "",
        "### 业务参与人员",
        "",
        f"{scenario.business_participants or '-'}",
        "",
        "### 参与的岗位",
        "",
        f"{scenario.participating_posts or '-'}",
        "",
        "### 业务流程简述",
        "",
        f"{scenario.business_flow or '-'}",
        "",
        "### 业务背景",
        "",
        f"{scenario.business_background or '-'}",
        "",
        "### 现存问题",
        "",
        f"{scenario.current_problems or '-'}",
        "",
    ]

    # 现存问题列表
    if scenario.existing_problems:
        lines.append("**问题选项：**")
        for problem in scenario.existing_problems:
            lines.append(f"- [x] {problem}")
        lines.append("")
    if scenario.other_problem_reason:
        lines.append(f"**其他问题原因**：{scenario.other_problem_reason}")
        lines.append("")

    lines.extend([
        "",
        "### 引入AI的目标",
        "",
        f"{scenario.ai_goals or '-'}",
        "",
        "---",
        "",
        "## 二、当前现状与进展",
        "",
        f"| 字段 | 内容 |",
        f"|---|---|",
        f"| 当前状态 | {scenario.current_status or '-'} |",
        f"| 进展 | {scenario.progress or '-'} |",
        f"| 当前应用现状 | {'已有项目在用' if scenario.current_project_status else '暂无项目在用'}{f'：{scenario.current_project_desc}' if scenario.current_project_status and scenario.current_project_desc else ''} |",
        f"| 成熟度 | {maturity_map.get(scenario.maturity_level, 'L1')} |",
        f"| 生命周期状态 | {scenario.lifecycle_status} |",
        f"| 负责人状态 | {director_status_map.get(scenario.director_status, '未指定')} |",
        f"| 负责人姓名 | {scenario.director_name or '-'} |",
        f"| 负责人情况说明 | {scenario.director_note or '-'} |",
        "",
    ])

    # 盘活路径
    lines.append("### 已完工未应用项目的盘活路径")
    lines.append("")
    if scenario.revival_path:
        lines.append(f"**盘活路径**：{scenario.revival_path}")
        lines.append("")
    if scenario.revival_path_options:
        lines.append("**盘活路径选项**：")
        for path in scenario.revival_path_options:
            lines.append(f"- [x] {path}")
        lines.append("")
    if scenario.revival_conclusion:
        lines.append(f"**盘活结论**：{scenario.revival_conclusion}")
        lines.append("")

    lines.extend([
        "---",
        "",
        "## 三、场景价值评估",
        "",
        f"| 评估维度 | 评分 |",
        f"|---|---|",
        f"| 业务价值 | {scenario.biz_value_score}/5 |",
        f"| 痛点强度 | {scenario.pain_point_score}/5 |",
        f"| 应用频率 | {scenario.frequency_score}/5 |",
        f"| 可落地性 | {scenario.feasibility_score}/5 |",
        f"| 可复制性 | {scenario.replicability_score}/5 |",
        f"| AI适配度 | {scenario.ai_fit_score}/5 |",
        f"| 风险可控性 | {scenario.risk_control_score}/5 |",
        f"| **总分** | **{scenario.total_score}/35** |",
        "",
        "### 投入产出评估",
        "",
        f"**预期收益**：{scenario.expected_benefit or '-'}",
        "",
    ])

    # 预期收益明细
    if scenario.expected_benefit_details:
        lines.append("**预期收益明细**：")
        details = scenario.expected_benefit_details
        if details.get('saved_hours'):
            lines.append(f"- 预计节省工时：{details['saved_hours']}")
        if details.get('efficiency'):
            lines.append(f"- 预计提升效率：{details['efficiency']}")
        if details.get('quality'):
            lines.append(f"- 预计提升质量：{details['quality']}")
        if details.get('risk_reduction'):
            lines.append(f"- 预计降低差错/风险：{details['risk_reduction']}")
        if details.get('org_capability'):
            lines.append(f"- 预计形成的组织能力沉淀：{details['org_capability']}")
        lines.append("")

    lines.extend([
        f"**所需投入**：{scenario.required_investment or '-'}",
        "",
    ])

    # 所需投入明细
    if scenario.required_investment_details:
        lines.append("**所需投入明细**：")
        details = scenario.required_investment_details
        if details.get('personnel'):
            lines.append(f"- 人员投入：{details['personnel']}")
        if details.get('timeline'):
            lines.append(f"- 时间周期：{details['timeline']}")
        if details.get('tools'):
            lines.append(f"- 工具/系统成本：{details['tools']}")
        if details.get('data'):
            lines.append(f"- 数据整理成本：{details['data']}")
        if details.get('coordination'):
            lines.append(f"- 跨部门协同成本：{details['coordination']}")
        lines.append("")

    lines.extend([
        f"**ROI综合判断**：{scenario.roi_judgment or '-'}",
        "",
        "---",
        "",
        "## 四、评估结论",
        "",
        f"| 评估结论 | {'A类' if scenario.category == 'A' else 'B类' if scenario.category == 'B' else 'C类' if scenario.category == 'C' else '-'} |",
        f"| 结论理由 | {scenario.category_reason or '-'} |",
        f"| 业务部门配合意愿 | {willingness_map.get(scenario.cooperation_willingness, '未知')} |",
        f"| 内部优先级 | {scenario.internal_priority or 0} |",
        "",
        "---",
        "",
        "## 五、推进计划",
        "",
        f"| 字段 | 内容 |",
        f"|---|---|",
        f"| 1个月目标 | {scenario.goal_1month or '-'} |",
        f"| 3个月目标 | {scenario.goal_3month or '-'} |",
        "",
    ])

    # 推进路径
    if scenario.promotion_path_options:
        lines.append("### 推进路径")
        lines.append("")
        for path in scenario.promotion_path_options:
            lines.append(f"- [x] {path}")
        lines.append("")

    # 里程碑
    if scenario.milestone:
        lines.extend([
            "### 里程碑",
            "",
            f"| 里程碑 | 计划完成时间 | 状态 |",
            f"|---|---|---|",
        ])
        for m in scenario.milestone:
            if m.get('name') and m.get('name').strip():
                lines.append(f"| {m.get('name', '')} | {m.get('plan_date', '-')} | {m.get('status', '未开始')} |")
        lines.append("")

    # 所需支持
    if scenario.required_support:
        lines.extend([
            "### 所需支持",
            "",
        ])
        for support in scenario.required_support:
            lines.append(f"- [x] {support}")
        lines.append("")

    lines.extend([
        "---",
        "",
        "## 六、跟进记录",
        "",
    ])

    # 跟进记录
    if followups:
        lines.extend([
            f"| 跟进时间 | 跟进人 | 轮次 | 生命周期状态 | 成熟度 | 分类 | 主要进展 |",
            f"|---|---|---|---|---|---|---|",
        ])
        for f in followups:
            lines.append(f"| {f.followup_date.strftime('%Y-%m-%d') if f.followup_date else '-'} | {f.followup_by or '-'} | 第{f.followup_round}次 | {f.lifecycle_status or '-'} | L{f.maturity_level or 1} | {f.category or '-'} | {f.progress_summary or '-'} |")
    else:
        lines.append("暂无跟进记录")

    lines.extend([
        "",
        "---",
        "",
        f"*报告生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*",
    ])

    return "\n".join(lines)


@router.get("/{scene_id}", response_model=ScenarioResponse)
def get_scenario(scene_id: int, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scene_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")
    return scenario


@router.post("", response_model=ScenarioResponse, status_code=201)
def create_scenario(scenario_data: ScenarioCreate, db: Session = Depends(get_db)):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            scene_code = generate_scene_code(db)

            total = (
                scenario_data.biz_value_score +
                scenario_data.pain_point_score +
                scenario_data.frequency_score +
                scenario_data.feasibility_score +
                scenario_data.replicability_score +
                scenario_data.ai_fit_score +
                scenario_data.risk_control_score
            )

            scenario = Scenario(
                scene_code=scene_code,
                **scenario_data.model_dump(),
                total_score=total,
                initial_filing_date=datetime.now()
            )

            db.add(scenario)
            db.commit()
            db.refresh(scenario)
            return scenario
        except IntegrityError:
            db.rollback()
            if attempt < max_retries - 1:
                continue
            raise HTTPException(status_code=500, detail="Failed to create scenario due to concurrent access")


@router.put("/{scene_id}", response_model=ScenarioResponse)
def update_scenario(scene_id: int, scenario_data: ScenarioUpdate, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scene_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    update_data = scenario_data.model_dump(exclude_unset=True)

    # Recalculate total score
    total = (
        update_data.get("biz_value_score", scenario.biz_value_score) +
        update_data.get("pain_point_score", scenario.pain_point_score) +
        update_data.get("frequency_score", scenario.frequency_score) +
        update_data.get("feasibility_score", scenario.feasibility_score) +
        update_data.get("replicability_score", scenario.replicability_score) +
        update_data.get("ai_fit_score", scenario.ai_fit_score) +
        update_data.get("risk_control_score", scenario.risk_control_score)
    )
    update_data["total_score"] = total
    update_data["updated_at"] = datetime.utcnow()

    for key, value in update_data.items():
        setattr(scenario, key, value)

    db.commit()
    db.refresh(scenario)
    return scenario


@router.delete("/{scene_id}", status_code=204)
def delete_scenario(scene_id: int, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scene_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    db.delete(scenario)
    db.commit()
    return None
