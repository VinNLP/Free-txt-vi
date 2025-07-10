ARG BASE_IMAGE
FROM $BASE_IMAGE

COPY api /api

ENV PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python
ENV PYTHONPATH=/api

WORKDIR /api

CMD [ "uvicorn", "runner.main:app", "--host", "0.0.0.0", "--port", "8000"]