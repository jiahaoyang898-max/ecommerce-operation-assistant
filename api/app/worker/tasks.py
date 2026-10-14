from typing import Any

from app.db.session import SessionLocal
from app.services.agent_maintenance import maintain_agent_runtime
from app.services.agent_runs import mark_agent_run_task_error, run_agent_workflow
from app.services.agent_workflows import (
    mark_registered_workflow_error,
    run_registered_agent_workflow,
)
from app.services.competitor_monitor_scheduler import run_due_competitor_monitors
from app.services.generation_jobs import (
    mark_stale_running_generation_jobs,
    process_next_generation_job,
    run_generation_job,
)
from app.services.outbox import dispatch_pending_outbox_events
from app.worker.celery_app import celery_app


@celery_app.task(name="generation.run_generation_job")
def run_generation_job_task(job_id: int) -> None:
    # Celery 任务保持很薄，只把调度来源标记为 worker，业务状态转换统一放在 service 层。
    """执行生成任务任务任务，把队列消息转换为可重试、可记录状态的后台任务执行。"""
    run_generation_job(job_id, worker_id="celery-worker")


@celery_app.task(bind=True, name="agent.run_product_operation", max_retries=2)
def run_agent_workflow_task(
    self,
    run_id: int,
    resume_payload: dict | None = None,
) -> None:
    """执行Agent工作流任务，把队列消息转换为可重试、可记录状态的后台任务执行。"""
    # 先处理输入与边界条件，再执行核心逻辑，最后返回稳定且可验证的结果。
    lease_owner = f"celery:{self.request.id}"
    try:
        run_agent_workflow(run_id, resume_payload, lease_owner=lease_owner)
    except Exception as exc:
        will_retry = self.request.retries < self.max_retries
        should_retry = mark_agent_run_task_error(
            run_id,
            exc,
            will_retry=will_retry,
            is_resume=resume_payload is not None,
            lease_owner=lease_owner,
        )
        if should_retry:
            raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))
        raise


@celery_app.task(bind=True, name="agent.run_registered_workflow", max_retries=2)
def run_registered_agent_workflow_task(
    self,
    run_id: int,
    resume_payload: dict | None = None,
) -> None:
    """执行已注册Agent工作流任务，把队列消息转换为可重试、可记录状态的后台任务执行。"""
    # 先处理输入与边界条件，再执行核心逻辑，最后返回稳定且可验证的结果。
    lease_owner = f"celery:{self.request.id}"
    try:
        run_registered_agent_workflow(run_id, resume_payload, lease_owner=lease_owner)
    except Exception as exc:
        will_retry = self.request.retries < self.max_retries
        should_retry = mark_registered_workflow_error(
            run_id,
            exc,
            will_retry=will_retry,
            lease_owner=lease_owner,
        )
        if should_retry:
            raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))
        raise


@celery_app.task(name="maintenance.dispatch_outbox")
def dispatch_outbox_events_task() -> int:
    """调度Outboxevents任务，把队列消息转换为可重试、可记录状态的后台任务执行。"""
    return dispatch_pending_outbox_events()


@celery_app.task(name="maintenance.agent_runtime")
def maintain_agent_runtime_task() -> dict[str, int]:
    """维护Agentruntime任务，把队列消息转换为可重试、可记录状态的后台任务执行。"""
    return maintain_agent_runtime()


@celery_app.task(name="maintenance.sweep_generation_jobs")
def sweep_generation_jobs_task() -> int:
    """兜底轮询生成任务：扫描已到期的 pending 任务并执行。

    入队消息可能在 next_run_at 尚未到达时就被消费（MySQL DATETIME 秒精度与
    进程间毫秒级竞态），此时 run_generation_job 会直接返回且不会有重投，
    任务将永久停留在 pending。这里按固定周期补齐，保证入队的生成任务最终一定被执行。
    """
    processed = 0
    for _ in range(5):
        # 单条任务的失败已由 run_generation_job 内部记录为任务状态与重试，不会向此处抛出。
        job_id = process_next_generation_job(worker_id="celery-sweeper")
        if job_id is None:
            break
        processed += 1
    return processed


@celery_app.task(name="maintenance.sweep_stale_generation_jobs")
def sweep_stale_generation_jobs_task() -> int:
    """兜底回收运行超时的生成任务：把长时间停留在 running 的任务按重试策略重新排队。

    与 pending 兜底轮询同源：worker 进程若在生成过程中被中断，任务会永久停在
    running 状态，必须有周期性的超时回收才能自愈。
    """
    with SessionLocal() as db:
        return mark_stale_running_generation_jobs(db)


@celery_app.task(name="maintenance.run_due_competitor_monitors")
def run_due_competitor_monitors_task() -> dict[str, Any]:
    """周期调度到期的竞品监控：集中执行业务校验、状态变更与持久化，并返回可验证结果。

    原实现仅能通过前端手动点击「检查」触发；注册进 beat 后由维护队列自动按周期
    拉取到期竞品页面并落库快照，失败项写入失败快照并继续下一条，不再依赖人工触发。
    """
    with SessionLocal() as db:
        result = run_due_competitor_monitors(db)
    return {
        "checked_count": result.checked_count,
        "succeeded_count": result.succeeded_count,
        "failed_count": result.failed_count,
        "skipped_count": result.skipped_count,
        "monitor_ids": result.monitor_ids,
        "errors": result.errors,
    }