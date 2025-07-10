from functools import wraps

from fastapi import HTTPException
from loguru import logger

from internal.common.exceptions.common import ExceptionInternalError


def exception_handler(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException as e:
            raise e
        except Exception as e:
            logger.exception(e)
            raise ExceptionInternalError from e
    return wrapper
