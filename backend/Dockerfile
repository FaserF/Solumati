FROM python:3.14-alpine

WORKDIR /app

RUN apk add --no-cache \
    gcc \
    musl-dev \
    postgresql-dev \
    libffi-dev

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p static/images

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7777", "--reload"]