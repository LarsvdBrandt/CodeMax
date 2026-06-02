import asyncio
import json
import os
import logging
import aio_pika
from database import AsyncSessionLocal
from agents.pipeline import run_pipeline

RABBITMQ_URL = os.environ["RABBITMQ_URL"]
QUEUE_NAME = "ai_jobs"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


async def handle_message(message: aio_pika.IncomingMessage) -> None:
    async with message.process(requeue=False):
        body = json.loads(message.body.decode())
        task_id = body["task_id"]
        project_id = body["project_id"]
        prompt = body["prompt"]
        log.info(f"Processing task {task_id} for project {project_id}")

        async with AsyncSessionLocal() as db:
            try:
                await run_pipeline(task_id, project_id, prompt, db)
                log.info(f"Task {task_id} completed")
            except Exception as exc:
                log.error(f"Task {task_id} failed: {exc}", exc_info=True)


async def main() -> None:
    log.info("Worker starting, connecting to RabbitMQ...")
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        log.info(f"Listening on queue: {QUEUE_NAME}")
        await queue.consume(handle_message)
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    asyncio.run(main())
