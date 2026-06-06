FROM python:3.12-slim

WORKDIR /app/algorithm

COPY algorithm/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY algorithm ./

ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]