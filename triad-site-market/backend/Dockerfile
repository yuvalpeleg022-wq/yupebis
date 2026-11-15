FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh && useradd --create-home triad && mkdir -p /app/hosted_sites && chown -R triad /app
USER triad
EXPOSE 8000
CMD ["./entrypoint.sh"]
