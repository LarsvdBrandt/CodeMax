import os
import json
import uuid
import aio_pika

RABBITMQ_URL = os.environ["RABBITMQ_URL"]
QUEUE_NAME = "ai_jobs"


async def publish_job(task_id: uuid.UUID, project_id: uuid.UUID, prompt: str) -> None:
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        message = aio_pika.Message(
            body=json.dumps({
                "task_id": str(task_id),
                "project_id": str(project_id),
                "prompt": prompt,
            }).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await channel.default_exchange.publish(message, routing_key=QUEUE_NAME)
