FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      gdal-bin \
      libeccodes-tools \
      python3 \
      python3-gdal \
      python3-numpy \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/weather

COPY bin ./bin
COPY config ./config
COPY src ./src

RUN chmod +x /opt/weather/bin/*.sh \
    && mkdir -p /data/input /data/output

ENTRYPOINT ["/opt/weather/bin/process-grib.sh"]
CMD ["--help"]
